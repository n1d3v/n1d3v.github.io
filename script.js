function updateClock() {
    const options = { 
        timeZone: 'Europe/London', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    };
    const now = new Date().toLocaleTimeString('en-GB', options);
    document.getElementById('clock').textContent = `for me it is: ${now}`;
}

setInterval(updateClock, 1000);
updateClock();