const ASTROS_TEAM_ID = 117;

let GAME_DATE = "";
let SAVE_KEY = "";

let events = [];
let revealedIndexes = [];

let awayTeamName = "";
let homeTeamName = "";
let currentGameData = null;
let currentGamePk = null;
let currentGameBroadcasts = [];

function setGameDate(newDate) {
    GAME_DATE = newDate;
    SAVE_KEY = `astros-tracker-${GAME_DATE}`;
    events = [];
    revealedIndexes = [];
    document.getElementById("gamePicker").classList.add("hidden");
    document.getElementById("trackerView").classList.remove("hidden");
    loadGame();
}

function getLocalDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function loadToday() {
    setGameDate(getLocalDate());
}

function loadYesterday() {
    setGameDate(getLocalDate(-1));
}

function showGamePicker() {
    document.getElementById("trackerView").classList.add("hidden");
    document.getElementById("gamePicker").classList.remove("hidden");
}

function loadPickedDate() {
    const pickedDate = document.getElementById("gameDate").value;

    if (!pickedDate) {
        alert("Pick a date first.");
        return;
    }

    setGameDate(pickedDate);
}

async function loadGame(askResume = true) {
    if (askResume) {
    document.getElementById("status").innerHTML = "Loading Astros game...";
    document.getElementById("batterInfo").innerHTML = "";
    document.getElementById("eventList").innerHTML = "";
}

    const scheduleUrl =
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${ASTROS_TEAM_ID}&date=${GAME_DATE}&hydrate=broadcasts(all)`;

    const scheduleResponse = await fetch(scheduleUrl);
    const scheduleData = await scheduleResponse.json();

    const games = scheduleData.dates?.[0]?.games || [];

    if (games.length === 0) {
        document.getElementById("status").innerHTML =
            "No Astros game found for that date.";
        return;
    }

    const scheduledGame = games[0];
    const gamePk = scheduledGame.gamePk;

    const feedUrl =
        `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

    const feedResponse = await fetch(feedUrl);
    const feedData = await feedResponse.json();

currentGameData = feedData;
currentGamePk = gamePk;
currentGameBroadcasts = scheduledGame.broadcasts || [];

awayTeamName = feedData.gameData.teams.away.teamName;
homeTeamName = feedData.gameData.teams.home.teamName;
    
    buildEvents(feedData);

    const saved = localStorage.getItem(SAVE_KEY);

if (askResume && saved) {
    const resume = confirm("Resume saved progress for this game?");

        if (resume) {
            try {
                const parsed = JSON.parse(saved);

                if (Array.isArray(parsed)) {
                    revealedIndexes = parsed;
                    redrawFeed();
                    return;
                }
            } catch {
                localStorage.removeItem(SAVE_KEY);
            }
        }
    }

    updateStatus();
}

function buildEvents(data) {
    events = [];

    const plays = data.liveData.plays.allPlays;
    let occupiedBases = { first: null, second: null, third: null };
    let previousHalf = "";

    plays.forEach((play, playNumber) => {
        const inning = play.about.inning;
        const half = play.about.halfInning.toUpperCase();
        const halfKey = `${half}-${inning}`;
        const batter = play.matchup.batter.fullName;
        const pitcher = play.matchup.pitcher.fullName;
        const battingSide = half === "TOP" ? "away" : "home";
        const appliedMovements = new Set();

        if (previousHalf && previousHalf !== halfKey) {
            occupiedBases = { first: null, second: null, third: null };
        }
        previousHalf = halfKey;

        function applyMovementsThrough(playEventIndex = Infinity) {
            (play.runners || []).forEach((runner, runnerIndex) => {
                const movementIndex = runner.details?.playIndex;
                if (appliedMovements.has(runnerIndex) || movementIndex > playEventIndex) return;

                const startKey = baseNameToKey(runner.movement?.start);
                const endKey = baseNameToKey(runner.movement?.end);
                if (startKey) occupiedBases[startKey] = null;
                if (endKey && !runner.movement?.isOut) {
                    occupiedBases[endKey] = runner.details?.runner?.fullName || "Runner";
                }
                appliedMovements.add(runnerIndex);
            });
        }

        play.playEvents.forEach(event => {
            const desc = event.details?.description;

            if (!desc) return;

const lowerDesc = desc.toLowerCase();

const hiddenEvents = [
    "mound visit",
    "batter timeout",
    "offensive timeout",
    "defensive timeout",
    "on-field delay"
];

const shouldHide = hiddenEvents.some(hidden =>
    lowerDesc.includes(hidden)
);

if (shouldHide) {
    return;
}

            applyMovementsThrough(event.index ?? -1);

            events.push({
                inning: `${half} ${inning}`,
                batter: batter,
                pitcher: pitcher,
                text: desc,
                atBat: playNumber,
                balls: event.count?.balls,
                strikes: event.count?.strikes,
                outs: event.count?.outs,
                pitchNumber: event.pitchNumber,
                battingSide,
                bases: { ...occupiedBases },
                hitLocation: getHitLocation(event),
                playEventIndex: event.index
            });
        });

        const resultText = play.result?.description;

        if (resultText) {
            applyMovementsThrough();
            events.push({
                inning: `${half} ${inning}`,
                batter: batter,
                pitcher: pitcher,
                text: `RESULT: ${resultText}`,
                atBat: playNumber,
                balls: play.count?.balls,
                strikes: play.count?.strikes,
                outs: play.count?.outs,
                pitchNumber: null,
                awayScore: play.result?.awayScore,
                homeScore: play.result?.homeScore,
                eventType: play.result?.eventType,
                battingSide,
                bases: { ...occupiedBases },
                isResult: true,
                hitLocation: getPlayHitLocation(play)
            });
        }
    });

    if (data.gameData.status?.abstractGameState === "Final") {
        events.push(buildGameCompleteEvent(data));
    }
}

function baseNameToKey(baseName) {
    return ({ "1B": "first", "2B": "second", "3B": "third" })[baseName] || null;
}

function getHitLocation(event) {
    const coordinates = event.hitData?.coordinates;
    if (!coordinates) return null;

    const x = Number(coordinates.coordX);
    const y = Number(coordinates.coordY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    return {
        x,
        y,
        trajectory: event.hitData?.trajectory || "",
        location: event.hitData?.location || ""
    };
}

function getPlayHitLocation(play) {
    for (let index = play.playEvents.length - 1; index >= 0; index--) {
        const location = getHitLocation(play.playEvents[index]);
        if (location) return location;
    }
    return null;
}

function formatGameTime(dateValue, timeZone) {
    if (!dateValue) return "Not available";

    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timeZone || undefined,
        timeZoneName: "short"
    }).format(new Date(dateValue));
}

function formatDuration(totalMinutes) {
    if (!Number.isFinite(totalMinutes)) return "Not available";

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

function buildGameCompleteEvent(data) {
    const gameInfo = data.gameData.gameInfo || {};
    const venue = data.gameData.venue || {};
    const weather = data.gameData.weather || {};
    const durationMinutes = Number(gameInfo.gameDurationMinutes);
    const startDate = gameInfo.firstPitch || data.gameData.datetime?.dateTime;
    const endDate = startDate && Number.isFinite(durationMinutes)
        ? new Date(new Date(startDate).getTime() + durationMinutes * 60000)
        : null;
    const timeZone = venue.timeZone?.id;
    const umpires = (data.liveData.boxscore?.officials || [])
        .map(item => `${item.official?.fullName || "Unknown"} (${item.officialType || "Official"})`);
    const networks = [...new Set(
        currentGameBroadcasts
            .filter(item => item.type === "TV")
            .map(item => item.name)
            .filter(Boolean)
    )];
    const decisions = data.liveData.decisions || {};
    const pitchCounts = ["away", "home"].map(teamSide => {
        const boxscoreTeam = data.liveData.boxscore?.teams?.[teamSide] || {};
        const players = boxscoreTeam.players || {};
        const pitchers = (boxscoreTeam.pitchers || []).map(pitcherId => {
            const pitcher = players[`ID${pitcherId}`];

            return {
                name: pitcher?.person?.fullName || "Unknown pitcher",
                pitches: pitcher?.stats?.pitching?.numberOfPitches
            };
        });

        return {
            team: data.gameData.teams?.[teamSide]?.teamName || teamSide,
            pitchers
        };
    });

    return {
        kind: "game-complete",
        inning: "FINAL",
        atBat: Number.MAX_SAFE_INTEGER,
        text: "Game Complete",
        details: {
            startTime: formatGameTime(startDate, timeZone),
            endTime: formatGameTime(endDate, timeZone),
            duration: formatDuration(durationMinutes),
            venue: venue.name || "Not available",
            attendance: Number.isFinite(Number(gameInfo.attendance))
                ? Number(gameInfo.attendance).toLocaleString("en-US")
                : "Not available",
            weather: weather.condition && weather.temp
                ? `${weather.temp}\u00B0F, ${weather.condition}`
                : weather.condition || "Not available",
            wind: weather.wind || "Not available",
            umpires: umpires.length ? umpires.join(", ") : "Not available",
            network: networks.length ? networks.join(", ") : "Not available",
            winningPitcher: decisions.winner?.fullName || "Not available",
            losingPitcher: decisions.loser?.fullName || "Not available",
            savePitcher: decisions.save?.fullName || "None",
            pitchCounts
        }
    };
}

function saveProgress() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(revealedIndexes));
}

function getCurrentIndex() {
    if (revealedIndexes.length === 0) {
        return -1;
    }

    return revealedIndexes[revealedIndexes.length - 1];
}

function getSpoilerFreeScore() {
    let awayScore = 0;
    let homeScore = 0;

    revealedIndexes.forEach(index => {
        const event = events[index];

        if (
            event.awayScore !== undefined &&
            event.homeScore !== undefined
        ) {
            awayScore = event.awayScore;
            homeScore = event.homeScore;
        }
    });

    return { awayScore, homeScore };
}
function getSpoilerFreeHitsErrors() {
    let awayHits = 0;
    let homeHits = 0;
    let awayErrors = 0;
    let homeErrors = 0;

    const hitTypes = [
        "single",
        "double",
        "triple",
        "home_run"
    ];

    revealedIndexes.forEach(index => {
        const event = events[index];

        if (!event.eventType) return;

        if (hitTypes.includes(event.eventType)) {
            if (event.battingSide === "away") {
                awayHits++;
            } else {
                homeHits++;
            }
        }

        if (
            event.eventType === "field_error" ||
            event.text.toLowerCase().includes("error")
        ) {
            if (event.battingSide === "away") {
                homeErrors++;
            } else {
                awayErrors++;
            }
        }
    });

    return {
        awayHits,
        homeHits,
        awayErrors,
        homeErrors
    };
}
function getPitcherPitchCount(pitcherName) {
    let count = 0;

    revealedIndexes.forEach(index => {
        const event = events[index];

        if (
            event.pitcher === pitcherName &&
            event.pitchNumber
        ) {
            count++;
        }
    });

    return count;
}

function getDisplayState() {
    const currentIndex = getCurrentIndex();
    if (events.length === 0) return null;

    if (currentIndex === -1) {
        return { event: events[0], preview: true, previous: null };
    }

    const current = events[currentIndex];
    const next = events[currentIndex + 1];
    if (current.isResult && next && next.kind !== "game-complete") {
        return { event: next, preview: true, previous: current };
    }

    return { event: current, preview: false, previous: null };
}

function renderBaseDiamond(bases = {}) {
    const occupied = key => bases[key] ? " occupied" : "";
    const label = [bases.first && `First: ${bases.first}`, bases.second && `Second: ${bases.second}`, bases.third && `Third: ${bases.third}`]
        .filter(Boolean).join(", ") || "Bases empty";

    return `
        <div class="base-diamond" aria-label="${label}" title="${label}">
            <span class="base second${occupied("second")}"></span>
            <span class="base third${occupied("third")}"></span>
            <span class="base first${occupied("first")}"></span>
            <span class="home-plate"></span>
        </div>
    `;
}

function getBattingQueue(event) {
    if (!event || !currentGameData) return { onDeck: "Not available", inHole: "Not available" };

    const maxAtBat = Math.max(-1, getCurrentIndex() === -1 ? -1 : events[getCurrentIndex()].atBat);
    const lineup = getLineupAtPoint(event.battingSide, maxAtBat);
    const batterIndex = lineup.findIndex(player => player.name === event.batter);
    if (batterIndex === -1 || lineup.length < 2) {
        return { onDeck: "Not available", inHole: "Not available" };
    }

    return {
        onDeck: lineup[(batterIndex + 1) % lineup.length]?.name || "Not available",
        inHole: lineup[(batterIndex + 2) % lineup.length]?.name || "Not available"
    };
}

function updateStatus() {
    const currentIndex = getCurrentIndex();
const score = getSpoilerFreeScore();
const totals = getSpoilerFreeHitsErrors();
    

    
document.getElementById("status").innerHTML = `
    <div class="scoreboard">
        <div class="rhe-header">
            <span></span>
            <span>R</span>
            <span>H</span>
            <span>E</span>
        </div>

<div class="rhe-row">
    <button class="team-link" onclick="showLineup('away')">${awayTeamName}</button>
    <span>${score.awayScore}</span>
    <span>${totals.awayHits}</span>
    <span>${totals.awayErrors}</span>
</div>

<div class="rhe-row">
    <button class="team-link" onclick="showLineup('home')">${homeTeamName}</button>
    <span>${score.homeScore}</span>
    <span>${totals.homeHits}</span>
    <span>${totals.homeErrors}</span>
</div>
    </div>
`;

    if (currentIndex === -1) {
        document.getElementById("batterInfo").innerHTML =
            "Press Next Event to begin.";
        return;
    }

    const displayState = getDisplayState();
    const event = displayState?.event;

    if (!event) return;

    if (event.kind === "game-complete") {
        document.getElementById("batterInfo").innerHTML = `
            <div class="inning-line">Game Complete</div>
            <div class="completion-message">Every event has been revealed.</div>
        `;
        return;
    }
    
    const pitcherPitchCount = getPitcherPitchCount(event.pitcher);
    
    const balls = displayState.preview ? 0 : (event.balls ?? 0);
const strikes = displayState.preview ? 0 : (event.strikes ?? 0);
const inningChanged = displayState.preview && displayState.previous?.inning !== event.inning;
const outs = displayState.preview
    ? (inningChanged ? 0 : (displayState.previous?.outs ?? 0))
    : (event.outs ?? 0);
const visibleBases = displayState.preview && displayState.previous
    ? displayState.previous.bases
    : event.bases;
const queue = getBattingQueue(event);

const ballDots =
    "&#9679; ".repeat(balls) +
    "&#9675; ".repeat(4 - balls);

const strikeDots =
    "&#9679; ".repeat(strikes) +
    "&#9675; ".repeat(3 - strikes);

const outDots =
    "&#9679; ".repeat(outs) +
    "&#9675; ".repeat(3 - outs);

document.getElementById("batterInfo").innerHTML = `
    <div class="inning-line">${event.inning}</div>

    <div class="matchup-line">
        <strong>${event.pitcher} (${pitcherPitchCount})</strong>
        <span> vs </span>
        <strong>${event.batter}</strong>
    </div>

    <div class="count-line">
        <span>&#9918; <span class="count-dots">${ballDots}</span></span>
<span><strong>K</strong> <span class="count-dots">${strikeDots}</span></span>
<span>&#10060; <span class="count-dots">${outDots}</span></span>
    </div>

    <div class="between-play-info">
        ${renderBaseDiamond(visibleBases)}
        <div class="batting-queue">
            <span><strong>On deck:</strong> ${queue.onDeck}</span>
            <span><strong>In the hole:</strong> ${queue.inHole}</span>
        </div>
    </div>
`;
}

function getEventIcon(event) {
    if (event.kind === "game-complete") return "&#10003;";

    const text = event.text.toLowerCase();

    if (event.pitchNumber) {
        const numbers = ["", "&#9312;", "&#9313;", "&#9314;", "&#9315;", "&#9316;", "&#9317;", "&#9318;", "&#9319;", "&#9320;"];
        return numbers[event.pitchNumber] || `P${event.pitchNumber}`;
    }

    if (text.includes("steals")) return "&#127939;";
    if (text.includes("pickoff")) return "&#9888;&#65039;";
    if (
        text.includes("homers") ||
        text.includes("home run") ||
        text.includes("grand slam")
    ) return "&#128165;";
    if (text.includes("pitching change")) return "&#128257;";
    if (text.includes("defensive")) return "&#129508;";

    return "&#8226;";
}

function addEventCard(index) {
    const event = events[index];
    const icon = getEventIcon(event);

    const row = document.createElement("div");
    row.className = event.kind === "game-complete"
        ? "event-row game-complete-card"
        : `event-row ${event.battingSide === "away" ? "away-event" : "home-event"}`;

    if (event.kind === "game-complete") {
        const details = event.details;
        const pitchCountHtml = details.pitchCounts.map(team => `
            <section class="pitch-count-team">
                <h4>${team.team}</h4>
                <ul>
                    ${team.pitchers.map(pitcher => `
                        <li>
                            <span>${pitcher.name}</span>
                            <strong>${pitcher.pitches ?? "N/A"} pitches</strong>
                        </li>
                    `).join("")}
                </ul>
            </section>
        `).join("");

        row.innerHTML = `
            <div class="game-complete-title">
                <span class="event-icon">${icon}</span>
                <span>Game Complete</span>
            </div>
            <dl class="game-complete-details">
                <div><dt>Start time</dt><dd>${details.startTime}</dd></div>
                <div><dt>End time</dt><dd>${details.endTime}</dd></div>
                <div><dt>Duration</dt><dd>${details.duration}</dd></div>
                <div><dt>Venue</dt><dd>${details.venue}</dd></div>
                <div><dt>Attendance</dt><dd>${details.attendance}</dd></div>
                <div><dt>Weather</dt><dd>${details.weather}</dd></div>
                <div><dt>Wind</dt><dd>${details.wind}</dd></div>
                <div class="wide"><dt>Umpires</dt><dd>${details.umpires}</dd></div>
                <div class="wide"><dt>Network</dt><dd>${details.network}</dd></div>
                <div><dt>Winning pitcher</dt><dd>${details.winningPitcher}</dd></div>
                <div><dt>Losing pitcher</dt><dd>${details.losingPitcher}</dd></div>
                <div><dt>Save</dt><dd>${details.savePitcher}</dd></div>
                <div class="wide">
                    <dt>Official pitch counts</dt>
                    <dd class="pitch-counts">${pitchCountHtml}</dd>
                </div>
            </dl>
        `;

        document.getElementById("eventList").prepend(row);
        return;
    }

    const fieldGraphic = event.isResult && event.hitLocation
        ? renderFieldLocation(event.hitLocation, event.text)
        : "";

    row.innerHTML = `
        <span class="event-icon">${icon}</span>
        <span class="event-text">${event.text}</span>
        ${fieldGraphic}
    `;

    document.getElementById("eventList").prepend(row);
}

function renderFieldLocation(location, description) {
    const x = Math.max(10, Math.min(240, location.x));
    const y = Math.max(10, Math.min(240, location.y));
    const caught = /flies out|lines out|pops out|caught|sacrifice fly/i.test(description);

    return `
        <div class="field-location" aria-label="Ball in play location">
            <svg viewBox="0 0 250 250" role="img" aria-label="Ball ${caught ? "caught" : "played"} at this field location">
                <path class="outfield-grass" d="M18 205 Q125 4 232 205 L125 242 Z"></path>
                <path class="infield-dirt" d="M125 128 L181 184 L125 240 L69 184 Z"></path>
                <path class="foul-line" d="M125 240 L18 205 M125 240 L232 205"></path>
                <path class="infield-line" d="M125 155 L154 184 L125 213 L96 184 Z"></path>
                <circle class="ball-marker${caught ? " caught" : ""}" cx="${x}" cy="${y}" r="7"></circle>
                ${caught ? `<circle class="catch-ring" cx="${x}" cy="${y}" r="12"></circle>` : ""}
            </svg>
            <span>${caught ? "Caught here" : "Played here"}</span>
        </div>
    `;
}

function redrawFeed() {
    document.getElementById("eventList").innerHTML = "";

    revealedIndexes.forEach(index => {
        addEventCard(index);
    });

    updateStatus();
}

function revealIndex(index) {
    revealedIndexes.push(index);
    addEventCard(index);
    saveProgress();
    updateStatus();
}

function revealThrough(targetIndex) {
    const currentIndex = getCurrentIndex();
    const lastIndex = Math.min(targetIndex, events.length - 1);
    if (lastIndex <= currentIndex) {
        updateStatus();
        return;
    }

    for (let index = currentIndex + 1; index <= lastIndex; index++) {
        revealedIndexes.push(index);
        addEventCard(index);
    }
    saveProgress();
    updateStatus();
}

function nextEvent() {
    const currentIndex = getCurrentIndex();
    const nextIndex = currentIndex + 1;

    if (nextIndex < events.length) {
        revealIndex(nextIndex);
    }
}

function previousEvent() {
    if (revealedIndexes.length === 0) {
        return;
    }

    revealedIndexes.pop();

    const list = document.getElementById("eventList");

    if (list.firstChild) {
        list.removeChild(list.firstChild);
    }

    saveProgress();
    updateStatus();
}

function nextAtBat() {
    const currentIndex = getCurrentIndex();
    if (events.length === 0) return;

    let scopeStart = currentIndex === -1 ? 0 : currentIndex;

    // At a completed plate-appearance boundary, advance through the upcoming
    // batter instead of trying to finish the already-completed batter again.
    if (
        currentIndex >= 0 &&
        events[currentIndex].isResult &&
        events[currentIndex + 1]?.kind !== "game-complete"
    ) {
        scopeStart = currentIndex + 1;
    }

    const targetAtBat = events[scopeStart]?.atBat;
    if (targetAtBat === undefined) return;

    let boundaryIndex = scopeStart;
    while (
        boundaryIndex < events.length &&
        events[boundaryIndex].atBat === targetAtBat
    ) {
        boundaryIndex++;
    }

    revealThrough(boundaryIndex - 1);
}

function nextInning() {
    const currentIndex = getCurrentIndex();
    if (events.length === 0) return;

    let scopeStart = currentIndex === -1 ? 0 : currentIndex;
    const nextEvent = events[currentIndex + 1];

    // If the previous half-inning is already complete, advance through the
    // upcoming half rather than stopping again at the same boundary.
    if (
        currentIndex >= 0 &&
        events[currentIndex].isResult &&
        nextEvent &&
        nextEvent.kind !== "game-complete" &&
        nextEvent.inning !== events[currentIndex].inning
    ) {
        scopeStart = currentIndex + 1;
    }

    const targetInning = events[scopeStart]?.inning;
    if (!targetInning) return;

    let boundaryIndex = scopeStart;
    while (
        boundaryIndex < events.length &&
        events[boundaryIndex].inning === targetInning
    ) {
        boundaryIndex++;
    }

    revealThrough(boundaryIndex - 1);
}

function jumpToLive() {
    if (events.length === 0) return;
    const confirmed = confirm("Reveal every event currently available and jump to live?");
    if (confirmed) revealThrough(events.length - 1);
}
function showLineup(teamSide) {
    if (!currentGameData) {
        alert("Game data is still loading.");
        return;
    }

    const teamData = currentGameData.gameData.teams[teamSide];
    const teamName = teamData.teamName;

    const currentIndex = getCurrentIndex();
    const maxAtBat =
        currentIndex === -1
            ? -1
            : events[currentIndex].atBat;

    const lineup = getLineupAtPoint(teamSide, maxAtBat);

    let lineupHtml = "";

    if (lineup.length === 0) {
        lineupHtml = "<p>Lineup is not available yet for this point in the game.</p>";
    } else {
        lineupHtml = "<ol class='lineup-list'>";

        lineup.forEach(player => {
            lineupHtml += `
                <li>
                    <span class="lineup-player">${player.name}</span>
                    <span class="lineup-position">${player.position}</span>
                </li>
            `;
        });

        lineupHtml += "</ol>";
    }

    document.getElementById("lineupTitle").innerHTML = `${teamName} Lineup`;
    document.getElementById("lineupBody").innerHTML = lineupHtml;
    document.getElementById("lineupModal").classList.remove("hidden");
}
function getLineupAtPoint(teamSide, maxAtBat) {
    const plays = currentGameData.liveData.plays.allPlays;
    const boxscoreTeam = currentGameData.liveData.boxscore.teams[teamSide];
    const players = boxscoreTeam.players || {};

    const lineupMap = new Map();

    plays.forEach((play, playIndex) => {
        const battingSide =
            play.about.halfInning === "top" ? "away" : "home";

        if (battingSide !== teamSide) return;

        const batterId = play.matchup.batter.id;
        const batterKey = `ID${batterId}`;
        const batterInfo = players[batterKey];

        if (!batterInfo) return;

        const battingOrder = batterInfo.battingOrder;
        if (!battingOrder) return;

        const lineupSpot = Math.floor(Number(battingOrder) / 100);
        if (lineupSpot < 1 || lineupSpot > 9) return;

        // First time we see a lineup spot = starter.
        if (!lineupMap.has(lineupSpot)) {
            lineupMap.set(lineupSpot, {
                spot: lineupSpot,
                name: batterInfo.person.fullName,
                position: batterInfo.position?.abbreviation || "\u2014"
            });
        }

        // After revealed point, do not apply future substitutions.
        if (playIndex > maxAtBat) {
            return;
        }

        // Up to revealed point, update if a new player appears in that spot.
        lineupMap.set(lineupSpot, {
            spot: lineupSpot,
            name: batterInfo.person.fullName,
            position: batterInfo.position?.abbreviation || "\u2014"
        });
    });

    return Array.from(lineupMap.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(entry => entry[1]);
}
function closeLineup() {
    document.getElementById("lineupModal").classList.add("hidden");
}
document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
}).format(new Date());
document.getElementById("gameDate").value = getLocalDate();

setInterval(() => {
    if (GAME_DATE && !document.getElementById("trackerView").classList.contains("hidden")) {
        loadGame(false);
    }
}, 15000);
