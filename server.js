const http = require('http');
const fs = require('fs');
const path = require('path');
const socketIO = require('socket.io');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const writeFile = util.promisify(fs.writeFile);

const PORT = 1234;

let currentCode = "";

let clientIds = []; // Array to store client IDs

const server = http.createServer(function (request, response) {
    var filePath = '.' + request.url;
    if (filePath == './') {
        filePath = './index.html';
    }

    var extname = String(path.extname(filePath)).toLowerCase();
    var mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        // add more MIME types if needed
    };

    var contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, function(error, content) {
        if (error) {
            console.log(error);
        } else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });

}).listen(PORT);

const io = socketIO(server);
console.log(`Server running at http://localhost:${PORT}/`);

io.on('connection', (socket) => {
    console.log('a user connected with id: ',socket.id); // This is working
    clientIds.push(socket.id); // Add the new client's ID to the array

    socket.emit('newLeader', clientIds[0]);
    socket.emit('yourID', socket.id); // Send the client their unique ID
    socket.emit('editorState', currentCode);

    socket.on('chat message', (msg) => {
        console.log(msg);
        socket.broadcast.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected with id: ', socket.id);
        const wasLeader = (socket.id === clientIds[0]); // Check if the disconnecting client was the leader

        const index = clientIds.indexOf(socket.id);
        if (index > -1) {
            clientIds.splice(index, 1); // Remove the disconnected client's ID from the array
        }
        // If the disconnecting client was the leader and there are any clients left, emit the 'newLeader' event to them
        if (wasLeader && clientIds.length > 0) {
            io.emit('newLeader', clientIds[0]);
        }    
    });

    socket.on('requestEditorState', () => {
        // Send the current state of the editor to the client
        socket.emit('editorState', currentCode);
    });

    socket.on('codeChange', (data) => {
        // Split the current code into an array of lines
        const lines = currentCode.split('\n');

        // Extract the start and end positions of the change
        const startLine = data.change.from.line;
        const startChar = data.change.from.ch;
        const endLine = data.change.to.line;
        const endChar = data.change.to.ch;

        // Calculate the number of lines to be replaced
        const linesToReplace = endLine - startLine + 1;

        // Replace the lines in the range specified by the start and end positions
        // with the new lines from the data object
        const newLines = data.change.text;

        // If the change is within a single line
        if (startLine === endLine) {
            const line = lines[startLine];
            const newLine = line.substring(0, startChar) + newLines.join('\n') + line.substring(endChar);
            lines[startLine] = newLine;
        } else {
            // Handle multi-line changes
            lines.splice(startLine, linesToReplace, ...newLines);
        }

        // Join the array of lines back into a string
        currentCode = lines.join('\n');

        console.log(currentCode ,"current");

        // Broadcast the 'codeChange' event to all clients, including the client ID
        socket.broadcast.emit('codeChange', data);
    });

    socket.on('executeCode', async (code) => {
        console.log(code);
        try {
            await writeFile("./code.js", code);
            let return_value = await exec("node ./code.js", { timeout: 50000 });
            let output = return_value.stdout;

            console.log("output", output);
            // Send the result back to the client
            socket.emit('codeResult', output);
        } catch (error) {
            console.log("Got error!");
            // Handle any errors that occurred while running the code
            socket.emit('codeError', `Error executing code. Please check it again`);
        }
    });
});