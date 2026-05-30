const events = [
    "Top 1 - Jeremy Peña takes ball one.",
    "Top 1 - Jeremy Peña fouls it away.",
    "Top 1 - Jeremy Peña singles to left.",
    "Top 1 - Isaac Paredes strikes out.",
    "Top 1 - Yordan Alvarez doubles."
];

let currentIndex = 0;

function nextEvent() {
    if (currentIndex < events.length) {
        document.getElementById("event").innerHTML =
            events[currentIndex];
        currentIndex++;
    }
}

function previousEvent() {
    if (currentIndex > 1) {
        currentIndex--;
        currentIndex--;
        document.getElementById("event").innerHTML =
            events[currentIndex];
        currentIndex++;
    }
}
