const ASTROS_TEAM_ID = 117;
const GAME_DATE = "2026-05-29";
const SAVE_KEY = `astros-tracker-${GAME_DATE}`;

let events = [];
let currentIndex = 0;

async function loadGame() {
    document.getElementById("event").innerHTML = "Loading Astros game...";

    const scheduleUrl =
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${ASTROS_TEAM_ID}&date=${GAME_DATE}`;

    const scheduleResponse = await fetch(scheduleUrl);
    const scheduleData = await scheduleResponse.json();

    const games = scheduleData.dates?.[0]?.games || [];

    if (games.length === 0) {
        document.getElementById("event").innerHTML =
            "No Astros game found for that date.";
        return;
    }

    const gamePk = games[0].gamePk;

    const feedUrl =
        `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

    const feedResponse = await fetch(feedUrl);
    const feedData = await feedResponse.json();

    buildEvents(feedData);

    const savedIndex = localStorage.getItem(SAVE_KEY);

    if (savedIndex !== null) {
        const resume = confirm(
            `Resume from Event ${Number(savedIndex) + 1} of ${events.length}?`
        );

        currentIndex = resume ? Number(savedIndex) : 0;
    } else {
        currentIndex = 0;
    }

    showEvent();
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
                atBat: playNumber
            });
        });

        const resultText = play.result?.description;

        if (resultText) {
            events.push({
                inning: `${half} ${inning}`,
                batter: batter,
                pitcher: pitcher,
                text: `RESULT: ${resultText}`,
                atBat: playNumber
            });
        }
    });
}

function saveProgress() {
    localStorage.setItem(SAVE_KEY, currentIndex);
}

function showEvent() {
    const event = events[currentIndex];

    saveProgress();

    document.getElementById("event").innerHTML = `
        <h2>${event.inning}</h2>
        <h3>${event.pitcher} vs ${event.batter}</h3>
        <p>${event.text}</p>
        <small>Event ${currentIndex + 1} of ${events.length}</small>
    `;
}

function nextEvent() {
    if (currentIndex < events.length - 1) {
        currentIndex++;
        showEvent();
    }
}

function previousEvent() {
    if (currentIndex > 0) {
        currentIndex--;
        showEvent();
    }
}

function nextAtBat() {
    const currentAtBat = events[currentIndex].atBat;

    while (
        currentIndex < events.length - 1 &&
        events[currentIndex].atBat === currentAtBat
    ) {
        currentIndex++;
    }

    showEvent();
}

function nextInning() {
    const currentInning = events[currentIndex].inning;

    while (
        currentIndex < events.length - 1 &&
        events[currentIndex].inning === currentInning
    ) {
        currentIndex++;
    }

    showEvent();
}

loadGame();
