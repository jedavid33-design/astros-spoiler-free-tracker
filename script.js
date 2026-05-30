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
    document.getElementById("status").innerHTML = "Loading Astros game...";
    document.getElementById("batterInfo").innerHTML = "";
    document.getElementById("eventList").innerHTML = "";

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

    document.getElementById("batterInfo").innerHTML = `
        <strong>${event.inning}</strong><br>
        <strong>${event.pitcher}</strong> vs <strong>${event.batter}</strong><br>
        Count: ${countText} | ${outsText}<br>
        ${pitchText}
    `;
}

function addEventCard(index) {
    const event = events[index];

    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
        <strong>${event.inning}</strong><br>
        ${event.pitcher} vs ${event.batter}<br>
        ${event.text}
    `;

    document.getElementById("eventList").prepend(card);
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
