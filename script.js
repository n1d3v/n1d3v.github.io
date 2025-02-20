function updateClock() {
    const options = { 
        timeZone: 'Europe/London', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    };

    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const now = formatter.format(new Date());

    document.getElementById('clock').textContent = `for me it is: ${now}`;
}

setInterval(updateClock, 1000);
updateClock();
