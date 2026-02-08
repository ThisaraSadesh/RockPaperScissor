const { test, expect } = require('@playwright/test');
const path = require('path');

test('two players with different camera inputs', async ({ browser }) => {
    // Create two separate browser contexts (like two different users)
    const context1 = await browser.newContext({
        permissions: ['camera', 'microphone'],
    });
    const context2 = await browser.newContext({
        permissions: ['camera', 'microphone'],
    });

    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    // Mock camera input for Player 1 with a video file
    await player1.context().grantPermissions(['camera']);
    await player1.evaluate(() => {
        // Override getUserMedia to return a mock video stream
        navigator.mediaDevices.getUserMedia = async () => {
            const video = document.createElement('video');
            video.src = '/path/to/mock-video-1.mp4'; // You'll need mock videos
            await video.play();
            return video.captureStream();
        };
    });

    // Mock camera input for Player 2 with a different video
    await player2.context().grantPermissions(['camera']);
    await player2.evaluate(() => {
        navigator.mediaDevices.getUserMedia = async () => {
            const video = document.createElement('video');
            video.src = '/path/to/mock-video-2.mp4';
            await video.play();
            return video.captureStream();
        };
    });

    // Player 1 creates a party
    await player1.goto('http://localhost:3000');
    await player1.click('text=Start Party');
    
    // Get the party code from Player 1's page
    const partyCode = await player1.textContent('[data-testid="party-code"]'); // Adjust selector

    // Player 2 joins the party
    await player2.goto('http://localhost:3000');
    await player2.fill('input[type="text"]', partyCode); // Adjust selector
    await player2.click('text=Join');

    // Wait for both players to be connected
    await player1.waitForSelector('text=2 players'); // Adjust based on your UI
    await player2.waitForSelector('text=2 players');

    // Test game interactions
    // For example, check if hand gestures are detected differently for each player
    
    // Clean up
    await context1.close();
    await context2.close();
});
