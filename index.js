const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
// Enable CORS
app.use(cors({
  origin: 'https://codenaassey.onrender.com',  // Allow your frontend domain
  methods: ['GET', 'POST'],  // Allow methods
  allowedHeaders: ['Content-Type']  // Allow headers
}));
let currentCode = ''; // Store current code
//To holding users information 
const socketsStatus = {};
// Serve static files (including the frontend HTML, CSS, JS files)
app.use(express.static('public'));

// Send the current code when a new user connects
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.emit('document-update', { code: currentCode });

    // Handle real-time collaborative code editing
    socket.on('document-update', (msg) => {
        if (msg.code !== currentCode) {
            currentCode = msg.code; // Update the shared code
            socket.broadcast.emit('document-update', msg); // Broadcast to all users except sender
        }
    });

    // Handle running code on the server using child_process
    socket.on('run-code', (code) => {
        // Save the code to a temporary JavaScript file
        const tempFileName = './tempCode.js';
        fs.writeFileSync(tempFileName, code);

        // Execute the JavaScript file in a separate process
        exec(`node ${tempFileName}`, (error, stdout, stderr) => {
            let output;
            if (error) {
                output = `Error: ${stderr}`;
            } else {
                output = stdout; // Send the output of the code
            }

            // Broadcast the output to all connected clients
            io.emit('code-output', output); // Emit to all users, including the sender

            // Clean up: remove the temporary file
            fs.unlinkSync(tempFileName);
        });
    });


    const socketId = socket.id;
    socketsStatus[socket.id] = {};


    console.log("connect");

    socket.on("voice", function(data) {

        var newData = data.split(";");
        newData[0] = "data:audio/ogg;";
        newData = newData[0] + newData[1];

        for (const id in socketsStatus) {

            if (id != socketId && !socketsStatus[id].mute && socketsStatus[id].online)
                socket.broadcast.to(id).emit("send", newData);
        }

    });

    socket.on("userInformation", function(data) {
        socketsStatus[socketId] = data;

        io.sockets.emit("usersUpdate", socketsStatus);
    });


    socket.on("disconnect", function() {
        delete socketsStatus[socketId];
    });


});

// Start the server on port 3000
server.listen(3000, () => {
    console.log('Server running on port 3000');
});
