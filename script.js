const ASTROS_TEAM_ID = 117;
const LOCATION_DEBUG_MODE = new URLSearchParams(window.location.search).get("locationDebug") === "1";
const ABS_INITIAL_CHALLENGES = 2;

// Each club has two eligible identity colors. At game load, the tracker
// chooses one solid marker color per team from the four possible matchup
// pairings, maximizing useful visual contrast between the opponents.
const TEAM_COLORS = {
    108: { primary: "#C8102E", alternate: "#0B1F3A" }, // Angels
    109: { primary: "#A71930", alternate: "#30CED8" }, // Diamondbacks
    110: { primary: "#F47A1F", alternate: "#171717" }, // Orioles
    111: { primary: "#C8102E", alternate: "#0B2D5C" }, // Red Sox
    112: { primary: "#0E4DB8", alternate: "#D71920" }, // Cubs
    113: { primary: "#D00027", alternate: "#1C1C1C" }, // Reds
    114: { primary: "#123B63", alternate: "#E31937" }, // Guardians
    115: { primary: "#5B2C83", alternate: "#C4CED4" }, // Rockies
    116: { primary: "#0C2340", alternate: "#FA6A1A" }, // Tigers
    117: { primary: "#F47A1F", alternate: "#002D62" }, // Astros
    118: { primary: "#1469B8", alternate: "#C89B3C" }, // Royals
    119: { primary: "#1261C9", alternate: "#F4F7FB" }, // Dodgers
    120: { primary: "#C8102E", alternate: "#142A55" }, // Nationals
    121: { primary: "#0B57A4", alternate: "#F47A1F" }, // Mets
    133: { primary: "#087A4B", alternate: "#F3C542" }, // Athletics
    134: { primary: "#FDB827", alternate: "#171717" }, // Pirates
    135: { primary: "#4A2C20", alternate: "#FFC425" }, // Padres
    136: { primary: "#0B3558", alternate: "#19A7A0" }, // Mariners
    137: { primary: "#F47A1F", alternate: "#171717" }, // Giants
    138: { primary: "#C8102E", alternate: "#12284B" }, // Cardinals
    139: { primary: "#123B63", alternate: "#79C8E8" }, // Rays
    140: { primary: "#1557B0", alternate: "#C8102E" }, // Rangers
    141: { primary: "#1261C9", alternate: "#D71920" }, // Blue Jays
    142: { primary: "#142A55", alternate: "#D31145" }, // Twins
    143: { primary: "#D7193F", alternate: "#1C4E80" }, // Phillies
    144: { primary: "#C8102E", alternate: "#13274F" }, // Braves
    145: { primary: "#1C1C1C", alternate: "#B8C2CC" }, // White Sox
    146: { primary: "#00A8A8", alternate: "#171717" }, // Marlins
    147: { primary: "#0B2343", alternate: "#F1F4F8" }, // Yankees
    158: { primary: "#17365D", alternate: "#F2B431" }  // Brewers
};

const DEFAULT_TEAM_COLORS = { primary: "#64748B", alternate: "#CBD5E1" };

const HIDDEN_EVENT_DESCRIPTIONS = [
    "mound visit",
    "batter timeout",
    "offensive timeout",
    "defensive timeout",
    "on-field delay",
    "pitcher step off"
];

let GAME_DATE = "";
let SAVE_KEY = "";

let events = [];
let revealedIndexes = [];

let awayTeamName = "";
let homeTeamName = "";
let awayTeamId = null;
let homeTeamId = null;
let currentGameData = null;
let currentGamePk = null;
let currentGameBroadcasts = [];
let currentSlateGames = [];
let selectedScheduleGame = null;
let selectedGameTeamColors = new Map();
let absChallengeEnabled = false;

function setGameDate(newDate) {
    GAME_DATE = newDate;
    events = [];
    revealedIndexes = [];
    currentGamePk = null;
    selectedScheduleGame = null;
    selectedGameTeamColors = new Map();
    absChallengeEnabled = false;
    showGamePicker();
    loadGameSlate();
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
    document.getElementById("locationDebugExport").classList.add("hidden");
}

function normalizeScheduleGame(game) {
    return {
        gamePk: Number(game.gamePk),
        gameDate: game.gameDate || "",
        awayTeamId: Number(game.teams?.away?.team?.id),
        homeTeamId: Number(game.teams?.home?.team?.id),
        awayTeamName: game.teams?.away?.team?.teamName || game.teams?.away?.team?.name || "Away team",
        homeTeamName: game.teams?.home?.team?.teamName || game.teams?.home?.team?.name || "Home team",
        venueName: game.venue?.name || "",
        broadcasts: Array.isArray(game.broadcasts) ? game.broadcasts : []
    };
}

function sortSlateGames(games) {
    return [...games].sort((first, second) => {
        const firstAstros = first.awayTeamId === ASTROS_TEAM_ID || first.homeTeamId === ASTROS_TEAM_ID;
        const secondAstros = second.awayTeamId === ASTROS_TEAM_ID || second.homeTeamId === ASTROS_TEAM_ID;
        if (firstAstros !== secondAstros) return firstAstros ? -1 : 1;
        return new Date(first.gameDate).getTime() - new Date(second.gameDate).getTime();
    });
}

function formatSlateDate(dateValue) {
    const [year, month, day] = String(dateValue).split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long", month: "long", day: "numeric"
    }).format(new Date(year, month - 1, day));
}

function formatSlateTime(dateValue) {
    if (!dateValue) return "Time not available";
    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric", minute: "2-digit"
    }).format(new Date(dateValue));
}

function renderSlateGame(game, featured = false) {
    const venue = game.venueName ? `<span class="slate-venue">${game.venueName}</span>` : "";
    return `
        <button class="slate-game${featured ? " featured-game" : ""}" type="button" data-game-pk="${game.gamePk}">
            <span class="slate-matchup">${featured ? "★ " : ""}${game.awayTeamName} at ${game.homeTeamName}</span>
            <span class="slate-time">${formatSlateTime(game.gameDate)}</span>
            ${venue}
        </button>
    `;
}

function renderGameSlate(games) {
    const slate = document.getElementById("gameSlate");
    const sorted = sortSlateGames(games);
    const astrosGames = sorted.filter(game => game.awayTeamId === ASTROS_TEAM_ID || game.homeTeamId === ASTROS_TEAM_ID);
    const otherGames = sorted.filter(game => !astrosGames.includes(game));

    if (!sorted.length) {
        slate.innerHTML = `<p class="slate-message">No MLB games are scheduled for ${formatSlateDate(GAME_DATE)}.</p>`;
        return;
    }

    slate.innerHTML = `
        <h3 class="slate-date">${formatSlateDate(GAME_DATE)}</h3>
        ${astrosGames.length ? `
            <section class="slate-section">
                <h4>ASTROS GAME</h4>
                ${astrosGames.map(game => renderSlateGame(game, true)).join("")}
            </section>
        ` : ""}
        ${otherGames.length ? `
            <section class="slate-section">
                <h4>${astrosGames.length ? "OTHER MLB GAMES" : "MLB GAMES"}</h4>
                ${otherGames.map(game => renderSlateGame(game)).join("")}
            </section>
        ` : ""}
    `;

    slate.querySelectorAll?.("[data-game-pk]").forEach(button => {
        button.addEventListener("click", () => selectGame(Number(button.dataset.gamePk)));
    });
}

async function loadGameSlate() {
    const slate = document.getElementById("gameSlate");
    slate.innerHTML = '<p class="slate-message">Loading MLB games...</p>';
    document.getElementById("gameDate").value = GAME_DATE;

    try {
        const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${GAME_DATE}&hydrate=broadcasts(all),venue`;
        const response = await fetch(scheduleUrl);
        if (!response.ok) throw new Error(`Schedule request failed (${response.status})`);
        const data = await response.json();
        currentSlateGames = (data.dates?.[0]?.games || []).map(normalizeScheduleGame);
        renderGameSlate(currentSlateGames);
    } catch (error) {
        console.error(error);
        slate.innerHTML = '<p class="slate-message">The MLB schedule could not be loaded. Please try again.</p>';
    }
}

function selectGame(gamePk) {
    const game = currentSlateGames.find(item => item.gamePk === Number(gamePk));
    if (!game) return;

    selectedScheduleGame = game;
    currentGamePk = game.gamePk;
    SAVE_KEY = `astros-tracker-game-${currentGamePk}`;
    events = [];
    revealedIndexes = [];
    document.getElementById("gamePicker").classList.add("hidden");
    document.getElementById("trackerView").classList.remove("hidden");
    loadGame(true);
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
    document.getElementById("status").innerHTML = "Loading game...";
    document.getElementById("batterInfo").innerHTML = "";
    document.getElementById("eventList").innerHTML = "";
}

    const scheduledGame = selectedScheduleGame;
    const gamePk = currentGamePk;
    if (!scheduledGame || !gamePk) return;

    const feedUrl =
        `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

    let feedData;
    try {
        const feedResponse = await fetch(feedUrl);
        if (!feedResponse.ok) throw new Error(`Game feed request failed (${feedResponse.status})`);
        feedData = await feedResponse.json();
    } catch (error) {
        console.error(error);
        if (askResume) document.getElementById("status").innerHTML = "This game could not be loaded. Please try again.";
        return;
    }

currentGameData = feedData;
currentGamePk = gamePk;
currentGameBroadcasts = scheduledGame.broadcasts || [];

awayTeamName = feedData.gameData.teams.away.teamName;
homeTeamName = feedData.gameData.teams.home.teamName;
awayTeamId = feedData.gameData.teams.away.id;
homeTeamId = feedData.gameData.teams.home.id;
selectedGameTeamColors = selectGameTeamColors(awayTeamId, homeTeamId);
    
    buildEvents(feedData);
    if (LOCATION_DEBUG_MODE) {
        document.getElementById("locationDebugExport").classList.remove("hidden");
    }

    const includesAstros = awayTeamId === ASTROS_TEAM_ID || homeTeamId === ASTROS_TEAM_ID;
    const legacySaveKey = includesAstros ? `astros-tracker-${GAME_DATE}` : null;
    const saved = localStorage.getItem(SAVE_KEY) || (legacySaveKey ? localStorage.getItem(legacySaveKey) : null);

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
    absChallengeEnabled = isABSChallengeGame(data);

    const plays = data.liveData.plays.allPlays;
    let occupiedBases = { first: null, second: null, third: null };
    let challengeState = absChallengeEnabled
        ? { away: ABS_INITIAL_CHALLENGES, home: ABS_INITIAL_CHALLENGES }
        : null;
    let previousHalf = "";
    let previousInning = 0;

    plays.forEach((play, playNumber) => {
        const inning = play.about.inning;
        const half = play.about.halfInning.toUpperCase();
        const halfKey = `${half}-${inning}`;
        const batter = play.matchup.batter.fullName;
        const pitcher = play.matchup.pitcher.fullName;
        const battingSide = half === "TOP" ? "away" : "home";
        const battingTeamId = data.gameData.teams[battingSide]?.id;
        const appliedMovements = new Set();
        let previousFeedCount = { balls: 0, strikes: 0, outs: play.playEvents?.[0]?.count?.outs ?? 0 };

        if (previousHalf && previousHalf !== halfKey) {
            occupiedBases = { first: null, second: null, third: null };
        }
        if (challengeState && inning >= 10 && inning !== previousInning) {
            if (challengeState.away === 0) challengeState.away = 1;
            if (challengeState.home === 0) challengeState.home = 1;
        }
        previousHalf = halfKey;
        previousInning = inning;

        const lastPitchEvent = [...(play.playEvents || [])]
            .reverse()
            .find(playEvent => playEvent.isPitch === true);

        function applyMovementsThrough(playEventIndex = Infinity) {
            const pendingMovements = (play.runners || [])
                .map((runner, runnerIndex) => ({ runner, runnerIndex }))
                .filter(({ runner, runnerIndex }) => {
                const movementIndex = runner.details?.playIndex;
                    return !appliedMovements.has(runnerIndex) &&
                        (movementIndex === undefined
                            ? playEventIndex === Infinity
                            : movementIndex <= playEventIndex);
                });

            occupiedBases = applyRunnerDestinations(occupiedBases, pendingMovements);
            pendingMovements.forEach(({ runnerIndex }) => appliedMovements.add(runnerIndex));
        }

        play.playEvents.forEach(event => {
            const countBeforeEvent = { ...previousFeedCount };
            previousFeedCount = {
                balls: event.count?.balls ?? previousFeedCount.balls,
                strikes: event.count?.strikes ?? previousFeedCount.strikes,
                outs: event.count?.outs ?? previousFeedCount.outs
            };
            const desc = event.details?.description;

            if (!desc) return;

            // Hidden administrative cards still participate in state timing.
            // Apply any runner movement first so the next visible event gets
            // the correct post-event bases without exposing the hidden card.
            applyMovementsThrough(event.index ?? -1);

            const lowerDesc = desc.toLowerCase();
            if (HIDDEN_EVENT_DESCRIPTIONS.some(hidden => lowerDesc.includes(hidden))) return;

            const isPitch = event.isPitch === true;
            const isTimerViolation = isPitchTimerViolation(event);
            const absReview = getABSReviewForEvent(play, event, lastPitchEvent);
            const finalCall = absReview ? getABSCall(event) : null;
            const originalCall = absReview && finalCall
                ? (absReview.isOverturned === true ? getOppositeABSCall(finalCall) : finalCall)
                : null;
            const challengeActor = absReview
                ? getChallengeActorLabel(absReview, play, data)
                : null;
            const originalCount = absReview?.isOverturned === true && originalCall
                ? applyABSCallToCount(countBeforeEvent, originalCall)
                : previousFeedCount;
            const displayText = absReview && originalCall
                ? formatABSChallengePitchText(originalCall, challengeActor)
                : desc;

            events.push({
                inning: `${half} ${inning}`,
                batter: batter,
                pitcher: pitcher,
                text: displayText,
                atBat: playNumber,
                balls: originalCount.balls,
                strikes: originalCount.strikes,
                outs: originalCount.outs,
                pitchNumber: event.pitchNumber,
                isPitch,
                countsAsPitch: isPitch && !isTimerViolation,
                isTimerViolation,
                battingSide,
                battingTeamId,
                teamColor: getTeamColor(battingTeamId),
                bases: { ...occupiedBases },
                challengeState: cloneChallengeState(challengeState),
                hasABSChallenge: Boolean(absReview),
                hitLocation: getHitLocation(event),
                playEventIndex: event.index
            });

            if (
                absReview &&
                finalCall &&
                absReview.inProgress !== true &&
                typeof absReview.isOverturned === "boolean"
            ) {
                challengeState = applyABSChallengeOutcome(challengeState, absReview, data);
                const challengeTeamId = Number(absReview.challengeTeamId) || battingTeamId;
                events.push({
                    inning: `${half} ${inning}`,
                    batter,
                    pitcher,
                    text: finalCall,
                    challengeLabel: absReview.isOverturned ? "🔴 Call overturned" : "🟢 Call confirmed",
                    atBat: playNumber,
                    balls: previousFeedCount.balls,
                    strikes: previousFeedCount.strikes,
                    outs: previousFeedCount.outs,
                    pitchNumber: null,
                    isPitch: false,
                    countsAsPitch: false,
                    isChallengeResult: true,
                    challengeTeamId,
                    challengeOverturned: absReview.isOverturned,
                    battingSide,
                    battingTeamId,
                    teamColor: getTeamColor(challengeTeamId),
                    bases: { ...occupiedBases },
                    challengeState: cloneChallengeState(challengeState),
                    playEventIndex: event.index
                });
            }
        });

        const resultText = play.result?.description;

        if (resultText) {
            applyMovementsThrough();
            occupiedBases = reconcileCompletedPlayBases(occupiedBases, play.runners || []);
            events.push({
                inning: `${half} ${inning}`,
                batter: batter,
                pitcher: pitcher,
                text: `RESULT: ${cleanChallengeResultDescription(resultText)}`,
                atBat: playNumber,
                balls: play.count?.balls,
                strikes: play.count?.strikes,
                outs: play.count?.outs,
                pitchNumber: null,
                awayScore: play.result?.awayScore,
                homeScore: play.result?.homeScore,
                eventType: play.result?.eventType,
                battingSide,
                battingTeamId,
                teamColor: getTeamColor(battingTeamId),
                bases: { ...occupiedBases },
                challengeState: cloneChallengeState(challengeState),
                isResult: true,
                hitLocation: getPlayHitLocation(play)
            });
        }
    });

    if (data.gameData.status?.abstractGameState === "Final") {
        events.push(buildGameCompleteEvent(data));
    }
}

function isPitchTimerViolation(event) {
    const details = event?.details || {};
    const searchable = [
        details.description,
        details.event,
        details.eventType,
        details.code,
        event?.type
    ].filter(Boolean).join(" ");

    return /pitch(?:er|ing)?[ _-]*timer[ _-]*violation|automatic[ _-]*(?:ball|strike)/i.test(searchable);
}

function cloneChallengeState(state) {
    return state ? { ...state } : null;
}

function isABSChallengeGame(data) {
    const gameData = data?.gameData || {};
    const absMetadata = gameData.absChallenges || {};

    // Prefer an explicit feed capability flag when one is available. MLB's
    // hasChallenges flag can remain absent until the first review, so it is
    // not sufficient by itself for the pregame/early-game scoreboard.
    if (
        absMetadata.enabled === true ||
        absMetadata.isEnabled === true ||
        absMetadata.hasChallenges === true ||
        gameData.gameInfo?.absChallengeEnabled === true ||
        gameData.rules?.absChallengeEnabled === true
    ) {
        return true;
    }

    // The MLB ABS challenge system applies to 2026+ championship-season
    // games. This fallback uses only game metadata, never future play events,
    // so showing the starting allowance cannot reveal whether a challenge
    // will occur later. Exhibition/All-Star/Spring games require an explicit
    // capability flag above.
    const officialDate = gameData.datetime?.officialDate || gameData.game?.officialDate || "";
    const season = Number(gameData.game?.season || String(officialDate).slice(0, 4));
    const gameType = gameData.game?.type || gameData.game?.gameType;
    return season >= 2026 && ["R", "F", "D", "L", "W"].includes(gameType);
}

function isABSChallengeReview(reviewDetails) {
    return Boolean(
        reviewDetails?.challengeTeamId &&
        String(reviewDetails.reviewType || "").endsWith("J")
    );
}

function getABSReviewForEvent(play, event, lastPitchEvent) {
    if (isABSChallengeReview(event.reviewDetails)) return event.reviewDetails;

    if (
        event === lastPitchEvent &&
        isABSChallengeReview(play.reviewDetails)
    ) {
        return play.reviewDetails;
    }

    return null;
}

function getABSCall(event) {
    const description = String(
        event.details?.call?.description ||
        event.details?.description ||
        ""
    ).toLowerCase();

    if (event.details?.isBall === true || description.includes("ball")) return "BALL";
    if (event.details?.isStrike === true || description.includes("strike")) return "STRIKE";
    return null;
}

function getOppositeABSCall(call) {
    if (call === "BALL") return "STRIKE";
    if (call === "STRIKE") return "BALL";
    return null;
}

function formatABSChallengePitchText(call, actorLabel) {
    const callText = String(call || "Call").toLowerCase()
        .replace(/^./, character => character.toUpperCase());
    const actorText = String(actorLabel || "Challenge requested")
        .replace(/\b\w/g, character => character.toUpperCase());
    return `🟡 ${callText}- ${actorText}`;
}

function applyABSCallToCount(count, call) {
    const next = {
        balls: count?.balls ?? 0,
        strikes: count?.strikes ?? 0,
        outs: count?.outs ?? 0
    };

    if (call === "BALL") next.balls++;
    if (call === "STRIKE") next.strikes++;
    return next;
}

function getChallengeActorLabel(reviewDetails, play, data) {
    const player = reviewDetails?.player;
    const playerId = Number(player?.id);
    let role = "";

    if (playerId && playerId === Number(play.matchup?.batter?.id)) {
        role = "Batter";
    } else if (playerId && playerId === Number(play.matchup?.pitcher?.id)) {
        role = "Pitcher";
    } else {
        const position = data.gameData?.players?.[`ID${playerId}`]?.primaryPosition;
        if (position?.abbreviation === "C" || position?.code === "2") role = "Catcher";
    }

    if (role) return `${role} challenged`;
    if (player?.fullName) return `${player.fullName} challenged`;
    return "Challenge requested";
}

function getTeamSideForId(teamId, data) {
    if (Number(teamId) === Number(data.gameData?.teams?.away?.id)) return "away";
    if (Number(teamId) === Number(data.gameData?.teams?.home?.id)) return "home";
    return null;
}

function applyABSChallengeOutcome(state, reviewDetails, data) {
    if (!state || reviewDetails.isOverturned !== false) return cloneChallengeState(state);

    const teamSide = getTeamSideForId(reviewDetails.challengeTeamId, data);
    if (!teamSide) return cloneChallengeState(state);

    return {
        ...state,
        [teamSide]: Math.max(0, state[teamSide] - 1)
    };
}

function cleanChallengeResultDescription(description) {
    const marker = /call on the field was (?:overturned|confirmed):\s*/i;
    const markerMatch = marker.exec(description);
    return markerMatch
        ? description.slice(markerMatch.index + markerMatch[0].length)
        : description;
}

function getRunnerIdentity(runner, fallbackIndex) {
    return runner.details?.runner?.id ??
        runner.details?.runner?.fullName ??
        `runner-${fallbackIndex}`;
}

function groupRunnerMovements(entries) {
    const groups = new Map();

    entries.forEach(entry => {
        const key = getRunnerIdentity(entry.runner, entry.runnerIndex);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
    });

    return [...groups.values()];
}

function getFinalRunnerMovement(entries) {
    const startBases = new Set(
        entries
            .map(({ runner }) => runner.movement?.start)
            .filter(Boolean)
    );
    const terminalEntries = entries.filter(({ runner }) => {
        const movement = runner.movement || {};
        return movement.isOut || !baseNameToKey(movement.end) || !startBases.has(movement.end);
    });

    return terminalEntries[terminalEntries.length - 1] || entries[entries.length - 1];
}

function applyRunnerDestinations(bases, entries) {
    const nextBases = { ...bases };

    entries.forEach(({ runner }) => {
        const originKey = baseNameToKey(runner.movement?.originBase);
        const startKey = baseNameToKey(runner.movement?.start);
        if (originKey) nextBases[originKey] = null;
        if (startKey) nextBases[startKey] = null;
    });

    groupRunnerMovements(entries).forEach(group => {
        const finalEntry = getFinalRunnerMovement(group);
        const movement = finalEntry.runner.movement || {};
        const endKey = baseNameToKey(movement.end);

        if (endKey && !movement.isOut) {
            nextBases[endKey] = finalEntry.runner.details?.runner?.fullName || "Runner";
        }
    });

    return nextBases;
}

function reconcileCompletedPlayBases(bases, runners) {
    const entries = runners.map((runner, runnerIndex) => ({ runner, runnerIndex }));
    return applyRunnerDestinations(bases, entries);
}

function baseNameToKey(baseName) {
    return ({ "1B": "first", "2B": "second", "3B": "third" })[baseName] || null;
}

function getTeamColors(teamId) {
    return TEAM_COLORS[Number(teamId)] || DEFAULT_TEAM_COLORS;
}

function getTeamColor(teamId) {
    return selectedGameTeamColors.get(Number(teamId)) || getTeamColors(teamId).primary;
}

function hexToRgb(hexColor) {
    const hex = hexColor.replace("#", "");
    return {
        red: parseInt(hex.slice(0, 2), 16) / 255,
        green: parseInt(hex.slice(2, 4), 16) / 255,
        blue: parseInt(hex.slice(4, 6), 16) / 255
    };
}

function relativeLuminance(hexColor) {
    const { red, green, blue } = hexToRgb(hexColor);
    const linearize = channel => channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;

    return 0.2126 * linearize(red) +
        0.7152 * linearize(green) +
        0.0722 * linearize(blue);
}

function rgbToLab(hexColor) {
    const { red, green, blue } = hexToRgb(hexColor);
    const linearize = channel => channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    const r = linearize(red);
    const g = linearize(green);
    const b = linearize(blue);
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const pivot = value => value > 0.008856
        ? Math.cbrt(value)
        : 7.787 * value + 16 / 116;

    return {
        lightness: 116 * pivot(y) - 16,
        a: 500 * (pivot(x) - pivot(y)),
        b: 200 * (pivot(y) - pivot(z))
    };
}

function perceptualColorDistance(firstColor, secondColor) {
    const first = rgbToLab(firstColor);
    const second = rgbToLab(secondColor);
    return Math.hypot(
        first.lightness - second.lightness,
        first.a - second.a,
        first.b - second.b
    );
}

function rgbToHueAndSaturation(hexColor) {
    const { red, green, blue } = hexToRgb(hexColor);
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const delta = maximum - minimum;
    let hue = 0;

    if (delta !== 0) {
        if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
        else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
        else hue = 60 * ((red - green) / delta + 4);
    }

    if (hue < 0) hue += 360;
    const lightness = (maximum + minimum) / 2;
    const saturation = delta === 0
        ? 0
        : delta / (1 - Math.abs(2 * lightness - 1));

    return { hue, saturation };
}

function getMatchupColorScore(firstColor, secondColor) {
    const firstLuminance = relativeLuminance(firstColor);
    const secondLuminance = relativeLuminance(secondColor);
    const firstHue = rgbToHueAndSaturation(firstColor);
    const secondHue = rgbToHueAndSaturation(secondColor);
    let score = perceptualColorDistance(firstColor, secondColor) +
        Math.abs(firstLuminance - secondLuminance) * 45;

    if (firstLuminance < 0.12 && secondLuminance < 0.12) score -= 35;
    if (firstLuminance > 0.82) score -= 28;
    if (secondLuminance > 0.82) score -= 28;

    const hueDifference = Math.min(
        Math.abs(firstHue.hue - secondHue.hue),
        360 - Math.abs(firstHue.hue - secondHue.hue)
    );
    const bothWarm = firstHue.saturation > 0.55 && secondHue.saturation > 0.55 &&
        (firstHue.hue <= 45 || firstHue.hue >= 340) &&
        (secondHue.hue <= 45 || secondHue.hue >= 340);

    if (bothWarm && hueDifference < 35) score -= 48;
    return score;
}

function selectGameTeamColors(firstTeamId, secondTeamId) {
    const firstIdentity = getTeamColors(firstTeamId);
    const secondIdentity = getTeamColors(secondTeamId);
    const firstCandidates = [firstIdentity.primary, firstIdentity.alternate];
    const secondCandidates = [secondIdentity.primary, secondIdentity.alternate];
    let bestPair = { first: firstCandidates[0], second: secondCandidates[0] };
    let bestScore = -Infinity;

    firstCandidates.forEach(firstColor => {
        secondCandidates.forEach(secondColor => {
            const score = getMatchupColorScore(firstColor, secondColor);
            if (score > bestScore) {
                bestScore = score;
                bestPair = { first: firstColor, second: secondColor };
            }
        });
    });

    return new Map([
        [Number(firstTeamId), bestPair.first],
        [Number(secondTeamId), bestPair.second]
    ]);
}

function getReadableTextColor(hexColor) {
    const hex = hexColor.replace("#", "");
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.62 ? "#172033" : "#FFFFFF";
}

const FIELD_CALIBRATION = {
    home: { x: 125, y: 205 },
    infield: {
        minimumY: 130,
        automaticRadius: 70,
        maximumRadius: 90,
        // These are gentle spatial guides, not replacements for MLB's point.
        // Position 4 is intentionally nearer second base than the old anchor.
        anchors: {
            "1": { x: 125, y: 168, weight: 0.45 },
            "2": { x: 125, y: 198, weight: 0.18 },
            "3": { x: 151, y: 169, weight: 0.16 },
            "4": { x: 139, y: 153, weight: 0.18 },
            "5": { x: 111, y: 169, weight: 0.18 },
            "6": { x: 111, y: 157, weight: 0.18 }
        }
    },
    outfield: {
        centerDeadZone: 18,
        fullLateralOffset: 58,
        deepY: 72,
        shallowY: 135,
        leftMaximumExpansion: 1.22,
        rightMaximumExpansion: 1.13,
        groundBallMinimumRadius: 72,
        groundBallMaximumRadius: 145,
        centerGroundCompression: 0.05,
        sideGroundCompression: 0.15,
        fullGroundSideOffset: 50
    },
    boundary: {
        inset: 3,
        searchIterations: 26
    }
};

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0, edge1, value) {
    if (edge0 === edge1) return value < edge0 ? 0 : 1;
    const normalized = clamp01((value - edge0) / (edge1 - edge0));
    return normalized * normalized * (3 - 2 * normalized);
}

function applyInfieldCalibration(x, y, position) {
    const settings = FIELD_CALIBRATION.infield;
    const home = FIELD_CALIBRATION.home;
    const radius = Math.hypot(x - home.x, y - home.y);
    const anchor = settings.anchors[position];

    if (!anchor || y < settings.minimumY || radius > settings.maximumRadius) {
        return { x, y };
    }

    return {
        x: x + (anchor.x - x) * anchor.weight,
        y: y + (anchor.y - y) * anchor.weight
    };
}

function isInfieldCalibrationRegion(location) {
    const settings = FIELD_CALIBRATION.infield;
    const home = FIELD_CALIBRATION.home;
    const radius = Math.hypot(location.x - home.x, location.y - home.y);
    const position = String(location.location || "");

    if (radius <= settings.automaticRadius) return true;

    return /^[1-6]$/.test(position) &&
        location.y >= settings.minimumY &&
        radius <= settings.maximumRadius;
}

function applyOutfieldLateralCalibration(x, y) {
    const settings = FIELD_CALIBRATION.outfield;
    const offset = x - FIELD_CALIBRATION.home.x;
    const absoluteOffset = Math.abs(offset);
    const lateralBlend = smoothstep(
        settings.centerDeadZone,
        settings.fullLateralOffset,
        absoluteOffset
    );
    const depthBlend = smoothstep(settings.deepY, settings.shallowY, y);
    const maximumExpansion = offset < 0
        ? settings.leftMaximumExpansion
        : settings.rightMaximumExpansion;
    const expansion = 1 + (maximumExpansion - 1) * lateralBlend * depthBlend;

    return FIELD_CALIBRATION.home.x + offset * expansion;
}

function applyShallowGroundBallCalibration(x, y, trajectory) {
    if (trajectory !== "ground_ball") return { x, y };

    const settings = FIELD_CALIBRATION.outfield;
    const home = FIELD_CALIBRATION.home;
    const dx = x - home.x;
    const dy = y - home.y;
    const radius = Math.hypot(dx, dy);

    if (
        y >= FIELD_CALIBRATION.infield.minimumY ||
        radius < settings.groundBallMinimumRadius ||
        radius > settings.groundBallMaximumRadius
    ) {
        return { x, y };
    }

    const sideBlend = smoothstep(
        settings.centerDeadZone,
        settings.fullGroundSideOffset,
        Math.abs(dx)
    );
    const compression = settings.centerGroundCompression +
        (settings.sideGroundCompression - settings.centerGroundCompression) * sideBlend;
    const calibratedRadius = radius * (1 - compression);
    const scale = calibratedRadius / radius;

    return {
        x: home.x + dx * scale,
        y: home.y + dy * scale
    };
}

function getOutfieldWallY(x) {
    // SVG wall: M15 105 Q125 -15 235 105
    const t = clamp01((x - 15) / 220);
    return 105 - 240 * t + 240 * t * t;
}

function isInsidePlayableField(x, y) {
    if (y > 205 || x < 15 || x > 235 || y < getOutfieldWallY(x)) return false;

    if (y >= 105) {
        const halfWidth = (205 - y) * 1.1;
        return x >= 125 - halfWidth && x <= 125 + halfWidth;
    }

    return true;
}

function projectToPlayableField(x, y) {
    if (isInsidePlayableField(x, y)) return { x, y };

    const home = FIELD_CALIBRATION.home;
    if (y >= home.y) return { ...home };

    // A ray in foul territory never intersects the fair-field polygon beyond
    // home plate. Clamp its angle to the nearest foul line before applying the
    // curved-wall projection so foul-line examples do not collapse to home.
    const forwardDistance = home.y - y;
    const maximumSideDistance = forwardDistance * 1.1;
    const originalSideDistance = x - home.x;
    const targetX = Math.abs(originalSideDistance) > maximumSideDistance
        ? home.x + Math.sign(originalSideDistance) * maximumSideDistance
        : x;
    const targetY = y;

    if (isInsidePlayableField(targetX, targetY)) {
        return { x: targetX, y: targetY };
    }

    const dx = targetX - home.x;
    const dy = targetY - home.y;
    const radius = Math.hypot(dx, dy);
    if (radius === 0) return { ...home };

    let insideRadius = 0;
    let outsideRadius = radius;

    for (let iteration = 0; iteration < FIELD_CALIBRATION.boundary.searchIterations; iteration++) {
        const testRadius = (insideRadius + outsideRadius) / 2;
        const testX = home.x + dx * (testRadius / radius);
        const testY = home.y + dy * (testRadius / radius);

        if (isInsidePlayableField(testX, testY)) {
            insideRadius = testRadius;
        } else {
            outsideRadius = testRadius;
        }
    }

    const insetRadius = Math.max(0, insideRadius - FIELD_CALIBRATION.boundary.inset);
    return {
        x: home.x + dx * (insetRadius / radius),
        y: home.y + dy * (insetRadius / radius)
    };
}

function calibrateHitLocation(location) {
    const position = String(location.location || "");
    let point;

    if (isInfieldCalibrationRegion(location)) {
        point = applyInfieldCalibration(location.x, location.y, position);
    } else {
        point = {
            x: applyOutfieldLateralCalibration(location.x, location.y),
            y: location.y
        };
        point = applyShallowGroundBallCalibration(
            point.x,
            point.y,
            location.trajectory
        );
    }

    return projectToPlayableField(point.x, point.y);
}

function getHitLocation(event) {
    const coordinates = event.hitData?.coordinates;
    if (!coordinates) return null;

    const x = Number(coordinates.coordX);
    const y = Number(coordinates.coordY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const location = {
        x,
        y,
        trajectory: event.hitData?.trajectory || "",
        location: event.hitData?.location || "",
        totalDistance: Number(event.hitData?.totalDistance) || null,
        launchAngle: Number(event.hitData?.launchAngle) || null
    };

    const calibrated = calibrateHitLocation(location);
    return {
        ...location,
        plotX: calibrated.x,
        plotY: calibrated.y,
        playEventIndex: event.index ?? null
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
            event.countsAsPitch
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

function getVisibleBases(displayState) {
    if (!displayState?.event) return { first: null, second: null, third: null };
    if (!displayState.preview || !displayState.previous) return displayState.event.bases;

    return displayState.previous.inning !== displayState.event.inning
        ? { first: null, second: null, third: null }
        : displayState.previous.bases;
}

function getVisibleChallengeState() {
    if (!absChallengeEnabled) return null;

    let visibleState = {
        away: ABS_INITIAL_CHALLENGES,
        home: ABS_INITIAL_CHALLENGES
    };

    revealedIndexes.forEach(index => {
        if (events[index]?.challengeState) {
            visibleState = { ...events[index].challengeState };
        }
    });

    return visibleState;
}

function renderChallengeDots(remaining) {
    if (!Number.isInteger(remaining)) return "";

    const dots = Array.from({ length: remaining }, () =>
        '<span class="challenge-dot" aria-hidden="true"></span>'
    ).join("");

    return `<span class="challenge-dots" aria-label="${remaining} ABS challenge${remaining === 1 ? "" : "s"} remaining" title="${remaining} ABS challenge${remaining === 1 ? "" : "s"} remaining">${dots}</span>`;
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
const challenges = getVisibleChallengeState();
const displayState = currentIndex === -1 ? null : getDisplayState();
const activeEvent = currentIndex === -1 ? events[0] : displayState?.event;
document.getElementById("batterInfo").style.setProperty(
    "--active-team-color",
    activeEvent?.battingTeamId ? getTeamColor(activeEvent.battingTeamId) : "#002D62"
);
    

    
document.getElementById("status").innerHTML = `
    <div class="scoreboard">
        <div class="rhe-header">
            <span></span>
            <span>R</span>
            <span>H</span>
            <span>E</span>
        </div>

<div class="rhe-row">
    <button class="team-link" onclick="showLineup('away')"><span>${awayTeamName}</span>${challenges ? renderChallengeDots(challenges.away) : ""}</button>
    <span>${score.awayScore}</span>
    <span>${totals.awayHits}</span>
    <span>${totals.awayErrors}</span>
</div>

<div class="rhe-row">
    <button class="team-link" onclick="showLineup('home')"><span>${homeTeamName}</span>${challenges ? renderChallengeDots(challenges.home) : ""}</button>
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
const visibleBases = getVisibleBases(displayState);
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

    if (event.isPitch) {
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

function isLowEmphasisEvent(event) {
    if (event.isResult) return false;
    if (event.isChallengeResult) return true;
    if (event.isPitch) return true;

    const text = event.text.toLowerCase();
    return text.includes("steals") ||
        text.includes("pickoff") ||
        text.includes("defensive indifference") ||
        text.includes("wild pitch") ||
        text.includes("passed ball");
}

function addEventCard(index) {
    const event = events[index];
    const icon = getEventIcon(event);

    const row = document.createElement("div");
    row.className = event.kind === "game-complete"
        ? "event-row game-complete-card"
        : `event-row team-event ${isLowEmphasisEvent(event) ? "low-emphasis" : "important-event"}`;

    if (event.kind !== "game-complete") {
        row.style.setProperty("--event-team-color", event.teamColor || "#64748B");
    }

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

    const hasFieldLocation = event.isResult && event.hitLocation;

    row.innerHTML = `
        <span class="event-icon">${icon}</span>
        <span class="event-content">
            ${event.challengeLabel ? `<span class="challenge-label">${event.challengeLabel}</span>` : ""}
            <span class="event-text">${event.text}</span>
        </span>
        ${hasFieldLocation ? `<span class="field-location-hint">Field view</span>` : ""}
    `;

    if (hasFieldLocation) {
        row.classList.add("location-available");
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `${event.text}. Open ball location.`);
        row.addEventListener("click", () => openFieldLocation(index));
        row.addEventListener("keydown", keyboardEvent => {
            if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                openFieldLocation(index);
            }
        });
    }

    document.getElementById("eventList").prepend(row);
}

function renderFieldLocation(location, description) {
    const x = location.plotX ?? location.x;
    const y = location.plotY ?? location.y;
    const caught = /flies out|lines out|pops out|caught|sacrifice fly/i.test(description);

    return `
        <div class="field-location expanded" aria-label="Ball in play location">
            <svg viewBox="0 0 250 250" role="img" aria-label="Ball ${caught ? "caught" : "played"} at this field location">
                <path class="outfield-grass" d="M15 105 Q125 -15 235 105 L125 205 Z"></path>
                <path class="infield-dirt" d="M125 125 L170 166 L125 211 L80 166 Z"></path>
                <path class="foul-line" d="M125 205 L15 105 M125 205 L235 105"></path>
                <path class="infield-line" d="M125 143 L151 169 L125 195 L99 169 Z"></path>
                <circle class="pitchers-mound" cx="125" cy="168" r="4"></circle>
                <path class="field-base" d="M125 138 L130 143 L125 148 L120 143 Z"></path>
                <path class="field-base" d="M151 164 L156 169 L151 174 L146 169 Z"></path>
                <path class="field-base" d="M99 164 L104 169 L99 174 L94 169 Z"></path>
                <circle class="ball-marker${caught ? " caught" : ""}" cx="${x}" cy="${y}" r="6"></circle>
                ${caught ? `<circle class="catch-ring" cx="${x}" cy="${y}" r="10"></circle>` : ""}
            </svg>
        </div>
    `;
}

function openFieldLocation(index) {
    const event = events[index];
    if (!event?.hitLocation) return;

    document.getElementById("fieldLocationTitle").textContent = event.text.replace(/^RESULT:\s*/, "");
    document.getElementById("fieldLocationBody").innerHTML = renderFieldLocation(event.hitLocation, event.text);
    const debugPanel = document.getElementById("fieldLocationDebug");
    const debugCopyButton = document.getElementById("fieldLocationDebugCopy");
    if (LOCATION_DEBUG_MODE) {
        const location = event.hitLocation;
        const debugData = {
            gamePk: currentGamePk,
            gameDate: GAME_DATE,
            atBatIndex: event.atBat,
            playEventIndex: location.playEventIndex,
            batter: event.batter,
            description: event.text.replace(/^RESULT:\s*/, ""),
            rawX: location.x,
            rawY: location.y,
            plotX: Number(location.plotX.toFixed(2)),
            plotY: Number(location.plotY.toFixed(2)),
            trajectory: location.trajectory || null,
            fieldLocationCode: location.location || null,
            totalDistance: location.totalDistance,
            launchAngle: location.launchAngle
        };
        debugPanel.textContent = JSON.stringify(debugData, null, 2);
        debugPanel.classList.remove("hidden");
        debugCopyButton.textContent = "Copy diagnostic data";
        debugCopyButton.classList.remove("hidden");
    } else {
        debugPanel.textContent = "";
        debugPanel.classList.add("hidden");
        debugCopyButton.classList.add("hidden");
    }
    document.getElementById("fieldLocationModal").classList.remove("hidden");
}

async function copyFieldLocationDebug() {
    const debugPanel = document.getElementById("fieldLocationDebug");
    const debugCopyButton = document.getElementById("fieldLocationDebugCopy");

    try {
        await navigator.clipboard.writeText(debugPanel.textContent);
        debugCopyButton.textContent = "Copied";
    } catch (error) {
        debugCopyButton.textContent = "Press and hold the data to copy";
    }
}

async function copyGameLocationDebug() {
    const debugButton = document.getElementById("locationDebugExport");
    const locationRecords = events
        .filter(event => event.isResult && event.hitLocation)
        .map(event => {
            const location = event.hitLocation;
            return {
                gamePk: currentGamePk,
                gameDate: GAME_DATE,
                atBatIndex: event.atBat,
                playEventIndex: location.playEventIndex,
                batter: event.batter,
                description: event.text.replace(/^RESULT:\s*/, ""),
                rawX: location.x,
                rawY: location.y,
                plotX: Number(location.plotX.toFixed(2)),
                plotY: Number(location.plotY.toFixed(2)),
                trajectory: location.trajectory || null,
                fieldLocationCode: location.location || null,
                totalDistance: location.totalDistance,
                launchAngle: location.launchAngle
            };
        });

    try {
        await navigator.clipboard.writeText(JSON.stringify(locationRecords, null, 2));
        debugButton.textContent = `Copied ${locationRecords.length} locations`;
    } catch (error) {
        debugButton.textContent = "Open a Field view to copy one location";
    }
}

function closeFieldLocation() {
    document.getElementById("fieldLocationModal").classList.add("hidden");
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
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeFieldLocation();
        closeLineup();
    }
});
document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
}).format(new Date());
document.getElementById("gameDate").value = getLocalDate();
document.addEventListener("DOMContentLoaded", () => loadToday());

setInterval(() => {
    if (GAME_DATE && !document.getElementById("trackerView").classList.contains("hidden")) {
        loadGame(false);
    }
}, 15000);
