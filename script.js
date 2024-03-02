let username = document.getElementById("username");
let message = document.getElementById("message");
let form = document.getElementById("message_form");
let list = document.getElementById("messages");
let runButton = document.getElementById("run");
let clientId;

let editor;

form.addEventListener('submit', function(e){
    e.preventDefault();
    // console.log(typeof(list1));
    console.log(username.value);
    list.innerHTML += (
        `<li>${username.value}: ${message.value}</li>`
        // '<li></li>'
        )
    socket.emit('chat message', `${username.value}: ${message.value}`); // let server know

    message.value = "";
    var chatHistory = document.querySelector('.chat-history');
    chatHistory.scrollTop = chatHistory.scrollHeight;
})

window.onload = function() {
  editor = CodeMirror(document.getElementById("code_with_highlight"), {
    lineNumbers: true,
    mode:  "javascript",
    viewportMargin: Infinity,
    // lint: true
  });
  editor.setSize(null, "100%");

  runButton.addEventListener('click', function() {
    let code = editor.getValue();
    // console.log(code);
    socket.emit('executeCode', code);
    toggle_output.onclick();
});

function handleChange(instance, change) {
    console.log("monke")
    // Check if the change is a newline
    if (change.origin === "+input" && change.text[0] === "" && change.text.length > 1) {
        // Manually insert a newline character
        change.text = ["\n"];
    }
    // Include the client ID in the 'codeChange' event
    socket.emit('codeChange', {change: change, id: clientId});
}

editor.on('change', handleChange);

socket.on('codeChange', function(data) {
    // Only apply the change if it was not originated by this client
    if (data.id !== clientId) {
        console.log("oiii", data.change.text, data.change.from, data.change.to);
        editor.off('change', handleChange); // Unbind the 'change' event handler
        editor.replaceRange(data.change.text.join('\n'), data.change.from, data.change.to);
        editor.on('change', handleChange); // Rebind the 'change' event handler
    }
});

socket.on('editorState', function(code) {
    // Set the value of the editor to the received code
    editor.off('change', handleChange); // Unbind the 'change' event handler

    editor.setValue(code);

    editor.on('change', handleChange); // Rebind the 'change' event handler

});

// When the client connects to the server, request the current state of the editor

// When the client receives the current state of the editor, apply it to the editor

socket.on('yourID', function(id) {
    clientId = id;
    console.log("yourId", clientId);
});

socket.on('newLeader', function(leaderId) {
    // Check if the new leader's ID matches this client's ID
    // if (leaderId === clientId) {
    //     // If the IDs match, display the 'run' button
    //     uploadButton.style.display = '';
    // } else {
    //     // If the IDs do not match, hide the 'run' button
    //     uploadButton.style.display = 'none';
    // }
    console.log('newLeaderId', leaderId);
});

// Get the saved value from localStorage
var savedUsername = localStorage.getItem('username');

// If there is a saved value, set the value of the input box to it
if (savedUsername !== null) {
    username.value = savedUsername;
}

document.getElementById('fileInput').addEventListener('change', function() {
    var file = this.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var contents = e.target.result;
            // Now you can use the contents of the file
            // For example, you can load it into your CodeMirror editor:
            editor.setValue(contents);
        };
        reader.readAsText(file);
    } else {
        alert("No file selected!");
    }
});

document.getElementById('download').addEventListener('click', function() {
    // Get the current code from the CodeMirror editor
    var code = editor.getValue();

    // Create a new Blob object using the code
    var blob = new Blob([code], {type: "text/plain;charset=utf-8"});

    // Create a link element
    var a = document.createElement("a");

    // Use the URL.createObjectURL function to create a URL representing the Blob
    a.href = URL.createObjectURL(blob);

    // Set the download attribute of the link to the desired file name
    a.download = "code.js";

    // Append the link to the body
    document.body.appendChild(a);

    // Simulate a click on the link
    a.click();

    // Remove the link from the body
    document.body.removeChild(a);
});
};

let chat = document.getElementById("chat-history");
let messageBox = document.getElementById("message_box")
let output = document.getElementById("output");
let toggle_output = document.getElementById("output_head")
toggle_output.onclick = function() {
    console.log("hi");
    chat.style.display = "none";
    messageBox.style.display = "none";
    output.style.display = "block";
    toggle_output.className = "active"
    toggle_chat.className = "inactive";
}
let toggle_chat = document.getElementById("chat_head")
toggle_chat.onclick = function() {
    chat.style.display = "block";
    messageBox.style.display = "block";
    output.style.display = "none";
    toggle_chat.className = "active"
    toggle_output.className = "inactive"
};

// Saving user name for a session

let user_name = document.getElementById("username");

// Save the value of the input box to localStorage whenever it changes
username.addEventListener('input', function() {
    localStorage.setItem('username', user_name.value);
});

// Set the value of the input box from localStorage when the page loads
// window.onload = function() {
//     var editor = CodeMirror(document.getElementById("code_with_highlight"), {
//         lineNumbers: true,
//         mode:  "javascript",
//         viewportMargin: Infinity,
//     });
//     editor.setSize(null, "100%");

//     // Get the saved value from localStorage
//     var savedUsername = localStorage.getItem('username');

//     // If there is a saved value, set the value of the input box to it
//     if (savedUsername !== null) {
//         username.value = savedUsername;
//     }
// };

// Socket.io
const socket = io();

socket.on('connect', () => {
    // When the client connects to the server, request the current state of the editor
    socket.emit('requestEditorState');
});

socket.on('chat message', (msg)=> {
    list.innerHTML += `<li>${msg}</li>`;
    var chatHistory = document.querySelector('.chat-history');
    chatHistory.scrollTop = chatHistory.scrollHeight;
})

socket.on('codeResult', function(result) {
    // Handle the result returned by the server
    // result to output box
    let result_array = result.split('\n');
    while (output.firstChild) {
        output.removeChild(output.firstChild);
    }
    result_array.forEach(item => {
        let newElement = document.createElement('p');
        newElement.textContent = item;
        newElement.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
        newElement.style.marginLeft = '10px';
        newElement.style.paddingLeft = '5px';
        output.appendChild(newElement);

        // Create a hr element
        let hr = document.createElement('hr');
        hr.style.border = 'none';
        hr.style.height = '1px';
        hr.style.width = '100%';
        hr.style.backgroundColor = 'rgba(128, 128, 128, 0.5)';
        // Append the hr element to the output
        output.appendChild(hr);
    });
    console.log(result_array);
    console.log(in_p);
    // output.innerHTML = result;
    console.log(result);
});

// Add an event listener for the 'codeError' event
socket.on('codeError', function(error) {
    // Handle the error returned by the server
    let newElement = document.createElement('p');
    newElement.textContent = error;
    newElement.style.color = 'red';
    while (output.firstChild) {
        output.removeChild(output.firstChild);
    }
    output.appendChild(newElement);
    console.error(error);
});

