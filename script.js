const ASTROS_TEAM_ID = 117;

let GAME_DATE = "2026-05-29";
let SAVE_KEY = `astros-tracker-${GAME_DATE}`;

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
    loadGame();
}

function loadToday() {
    const today = new Date().toISOString().split("T")[0];
    setGameDate(today);
}

function loadYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setGameDate(yesterday.toISOString().split("T")[0]);
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

    plays.forEach((play, playNumber) => {
        const inning = play.about.inning;
        const half = play.about.halfInning.toUpperCase();
        const batter = play.matchup.batter.fullName;
        const pitcher = play.matchup.pitcher.fullName;

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

            events.push({
                inning: `${half} ${inning}`,
                batter: batter,
                pitcher: pitcher,
                text: desc,
                atBat: playNumber,
                balls: event.count?.balls,
                strikes: event.count?.strikes,
                outs: event.count?.outs,
                pitchNumber: event.pitchNumber
            });
        });

        const resultText = play.result?.description;

        if (resultText) {
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
                battingSide: half === "TOP" ? "away" : "home"
            });
        }
    });

    if (data.gameData.status?.abstractGameState === "Final") {
        events.push(buildGameCompleteEvent(data));
    }
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
            weather: weather.condition && weather.temp
                ? `${weather.temp}\u00B0F, ${weather.condition}`
                : weather.condition || "Not available",
            wind: weather.wind || "Not available",
            umpires: umpires.length ? umpires.join(", ") : "Not available",
            network: networks.length ? networks.join(", ") : "Not available"
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

    const event = events[currentIndex];

    if (event.kind === "game-complete") {
        document.getElementById("batterInfo").innerHTML = `
            <div class="inning-line">Game Complete</div>
            <div class="completion-message">Every event has been revealed.</div>
        `;
        return;
    }
    
    const pitcherPitchCount = getPitcherPitchCount(event.pitcher);
    
    const countText =
        event.balls !== undefined && event.strikes !== undefined
            ? `${event.balls}-${event.strikes}`
            : "N/A";

    const outsText =
        event.outs !== undefined
            ? `${event.outs} out(s)`
            : "N/A";

    const pitchText =
        event.pitchNumber
            ? `Pitch #${event.pitchNumber}`
            : "Plate appearance result";

    const balls = event.balls ?? 0;
const strikes = event.strikes ?? 0;
const outs = event.outs ?? 0;

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
    if (text.includes("homers") || text.includes("home run")) return "&#128165;";
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
        : "event-row";

    if (event.kind === "game-complete") {
        const details = event.details;

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
                <div><dt>Weather</dt><dd>${details.weather}</dd></div>
                <div><dt>Wind</dt><dd>${details.wind}</dd></div>
                <div class="wide"><dt>Umpires</dt><dd>${details.umpires}</dd></div>
                <div class="wide"><dt>Network</dt><dd>${details.network}</dd></div>
            </dl>
        `;

        document.getElementById("eventList").prepend(row);
        return;
    }

    row.innerHTML = `
        <span class="event-icon">${icon}</span>
        <span class="event-text">${event.text}</span>
    `;

    document.getElementById("eventList").prepend(row);
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

    if (currentIndex === -1) {
        nextEvent();
        return;
    }

    const currentAtBat = events[currentIndex].atBat;
    let nextIndex = currentIndex + 1;

    while (
        nextIndex < events.length &&
        events[nextIndex].atBat === currentAtBat
    ) {
        nextIndex++;
    }

    if (nextIndex < events.length) {
        revealIndex(nextIndex);
    }
}

function nextInning() {
    const currentIndex = getCurrentIndex();

    if (currentIndex === -1) {
        nextEvent();
        return;
    }

    const currentInning = events[currentIndex].inning;
    let nextIndex = currentIndex + 1;

    while (
        nextIndex < events.length &&
        events[nextIndex].inning === currentInning
    ) {
        nextIndex++;
    }

    if (nextIndex < events.length) {
        revealIndex(nextIndex);
    }
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
                name: batterInfo.person.fullName,
                position: batterInfo.position?.abbreviation || "\u2014"
            });
        }

        // After revealed point, do not apply future substitutions.
        if (maxAtBat !== -1 && playIndex > maxAtBat) {
            return;
        }

        // Up to revealed point, update if a new player appears in that spot.
        lineupMap.set(lineupSpot, {
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
loadGame();

setInterval(() => {
    loadGame(false);
}, 15000);
