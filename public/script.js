const socket = io(); // Establish socket connection

// CodeMirror Editor setup
const editor = CodeMirror(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "javascript",
    theme: "monokai",
    autoCloseBrackets: true,
    lineWrapping: true,
});

let currentCode = editor.getValue();

// Sync code editor with server
editor.on("change", () => {
    const newCode = editor.getValue();
    if (newCode !== currentCode) {
        currentCode = newCode;
        socket.emit("document-update", { code: currentCode });
    }
});

// Receive code update from server
socket.on("document-update", (msg) => {
    if (msg.code !== currentCode) {
        currentCode = msg.code;
        editor.setValue(currentCode);
    }
});

// Handle code execution
document.getElementById("run-btn").addEventListener("click", () => {
    socket.emit("run-code", editor.getValue());
});

// Display code output
socket.on("code-output", (output) => {
    document.getElementById("output").textContent = output;
});

// Voice chat functionality
const userStatus = {
    microphone: false,
    mute: false,
    username: "user#" + Math.floor(Math.random() * 999999),
    online: false,
};

const usernameInput = document.getElementById("username");
const usernameLabel = document.getElementById("username-label");
const usernameDiv = document.getElementById("username-div");
const usersDiv = document.getElementById("users");

usernameInput.value = userStatus.username;
usernameLabel.innerText = userStatus.username;

window.onload = () => {
    startVoiceChat();
};

function startVoiceChat() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        let mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        let audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", (event) => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
            let audioBlob = new Blob(audioChunks);
            audioChunks = [];

            let fileReader = new FileReader();
            fileReader.readAsDataURL(audioBlob);
            fileReader.onloadend = function() {
                if (!userStatus.microphone || !userStatus.online) return;

                let base64String = fileReader.result;
                socket.emit("voice", base64String);
            };

            mediaRecorder.start();

            setTimeout(() => {
                mediaRecorder.stop();
            }, 1000);
        });

        setTimeout(() => {
            mediaRecorder.stop();
        }, 1000);
    });

    socket.on("send", (data) => {
        let audio = new Audio(data);
        audio.play();
    });

    socket.on("usersUpdate", (data) => {
        usersDiv.innerHTML = "";
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                let element = data[key];
                let li = document.createElement("li");
                li.innerText = element.username;
                usersDiv.append(li);
            }
        }
    });
}

// Other UI interactions
usernameLabel.onclick = function() {
    usernameDiv.style.display = "block";
    usernameLabel.style.display = "none";
};

function changeUsername() {
    userStatus.username = usernameInput.value;
    usernameLabel.innerText = userStatus.username;
    usernameDiv.style.display = "none";
    usernameLabel.style.display = "block";
    emitUserInformation();
}

function toggleConnection(e) {
    userStatus.online = !userStatus.online;
    editButtonClass(e, userStatus.online);
    emitUserInformation();
}

function toggleMute(e) {
    userStatus.mute = !userStatus.mute;
    editButtonClass(e, userStatus.mute);
    emitUserInformation();
}

function toggleMicrophone(e) {
    userStatus.microphone = !userStatus.microphone;
    editButtonClass(e, userStatus.microphone);
    emitUserInformation();
}

function editButtonClass(target, bool) {
    const classList = target.classList;
    classList.remove("enable-btn");
    classList.remove("disable-btn");

    if (bool) {
        classList.add("enable-btn");
    } else {
        classList.add("disable-btn");
    }
}

function emitUserInformation() {
    socket.emit("userInformation", userStatus);
}