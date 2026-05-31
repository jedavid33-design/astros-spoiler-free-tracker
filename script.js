const ASTROS_TEAM_ID = 117;

let GAME_DATE = "2026-05-29";
let SAVE_KEY = `astros-tracker-${GAME_DATE}`;

let events = [];
let revealedIndexes = [];

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
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${ASTROS_TEAM_ID}&date=${GAME_DATE}`;

    const scheduleResponse = await fetch(scheduleUrl);
    const scheduleData = await scheduleResponse.json();

    const games = scheduleData.dates?.[0]?.games || [];

    if (games.length === 0) {
        document.getElementById("status").innerHTML =
            "No Astros game found for that date.";
        return;
    }

    const gamePk = games[0].gamePk;

    const feedUrl =
        `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

    const feedResponse = await fetch(feedUrl);
    const feedData = await feedResponse.json();

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

if (shouldHide || lowerDesc.startsWith("in play")) {
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
                homeScore: play.result?.homeScore
            });
        }
    });
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

function updateStatus() {
    const currentIndex = getCurrentIndex();
    const score = getSpoilerFreeScore();

    document.getElementById("status").innerHTML = `
        <strong>Date:</strong> ${GAME_DATE}<br>
        <strong>Score:</strong> Away ${score.awayScore} - Home ${score.homeScore}<br>
        <strong>Revealed:</strong> ${revealedIndexes.length} events<br>
        <strong>Total Events:</strong> ${events.length}
    `;

    if (currentIndex === -1) {
        document.getElementById("batterInfo").innerHTML =
            "Press Next Event to begin.";
        return;
    }

    const event = events[currentIndex];

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
    "● ".repeat(balls) +
    "○ ".repeat(4 - balls);

const strikeDots =
    "● ".repeat(strikes) +
    "○ ".repeat(3 - strikes);

const outDots =
    "● ".repeat(outs) +
    "○ ".repeat(3 - outs);

document.getElementById("batterInfo").innerHTML = `
    <div class="inning-line">${event.inning}</div>

    <div class="matchup-line">
        <strong>${event.pitcher}</strong>
        <span> vs </span>
        <strong>${event.batter}</strong>
    </div>

    <div class="count-line">
        <span>⚾️ ${ballDots}</span>
       <span><strong>K</strong> ${strikeDots}</span>
        <span>❌ ${outDots}</span>
    </div>
`;
}

function getEventIcon(event) {
    const text = event.text.toLowerCase();

    if (event.pitchNumber) {
        const numbers = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
        return numbers[event.pitchNumber] || `P${event.pitchNumber}`;
    }

    if (text.includes("steals")) return "🏃";
    if (text.includes("pickoff")) return "⚠️";
    if (text.includes("homers") || text.includes("home run")) return "💥";
    if (text.includes("pitching change")) return "🔁";
    if (text.includes("defensive")) return "🧤";

    return "•";
}

function addEventCard(index) {
    const event = events[index];
    const icon = getEventIcon(event);

    const row = document.createElement("div");
    row.className = "event-row";

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

loadGame();

setInterval(() => {
    loadGame(false);
}, 15000);
