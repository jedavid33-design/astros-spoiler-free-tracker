const events = [
    {
        inning: "Top 1",
        batter: "Jeremy Peña",
        text: "Ball 1",
        atBat: 1
    },
    {
        inning: "Top 1",
        batter: "Jeremy Peña",
        text: "Foul ball",
        atBat: 1
    },
    {
        inning: "Top 1",
        batter: "Jeremy Peña",
        text: "Singles to left field",
        atBat: 1
    },
    {
        inning: "Top 1",
        batter: "Isaac Paredes",
        text: "Called strike",
        atBat: 2
    },
    {
        inning: "Top 1",
        batter: "Isaac Paredes",
        text: "Strikes out swinging",
        atBat: 2
    },
    {
        inning: "Top 1",
        batter: "Yordan Alvarez",
        text: "Doubles to right field",
        atBat: 3
    }
];

let currentIndex = 0;

function showEvent() {
    const event = events[currentIndex];

    document.getElementById("event").innerHTML = `
        <h2>${event.inning}</h2>
        <h3>${event.batter}</h3>
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

showEvent();
