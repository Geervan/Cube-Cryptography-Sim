
/* Mode Handling Logic */
const workspace = document.querySelector('.lab-workspace');
const chatPanel = document.getElementById('mode-chat');
const tabEnc = document.getElementById('tab-enc');
const tabDec = document.getElementById('tab-dec');
const tabChat = document.getElementById('tab-chat');

/* Initialize Chat Mode */
/* We default to hidden in CSS, but let's make sure our toggle logic works */

// Add event listener to new tab
if (tabChat) {
    tabChat.addEventListener('click', () => {
        setChatMode(true);
    });
}

// Hook into existing tabs to turn OFF chat mode
tabEnc.addEventListener('click', () => {
    setChatMode(false);
    // existing setup (in main.js) handles enc logic
});

tabDec.addEventListener('click', () => {
    setChatMode(false);
    // existing setup (in main.js) handles dec logic
});

function setChatMode(enable) {
    if (enable) {
        workspace.style.display = 'none'; // Hide normal Enc/Dec panels
        chatPanel.classList.add('active'); // Show Chat Panel

        tabChat.classList.add('active');
        tabEnc.classList.remove('active');
        tabDec.classList.remove('active');

        // Reset Camera or State if needed?
        // Maybe keeping it the same is cool.
    } else {
        workspace.style.display = 'flex'; // Restore normal layout
        chatPanel.classList.remove('active');

        tabChat.classList.remove('active');
        // The other tab will set its own active state in main.js logic (which we haven't touched)
        // But main.js logic expects one of them to be clicked.
        // We just need to make sure we don't break it.
    }
}
