const promptForm = document.querySelector(".prompt-form");
const container = document.querySelector(".container");
const chatContainer = document.querySelector(".chats-container");
const promptInput = document.querySelector(".prompt-input");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const themetoggle = document.querySelector("#theme-toggle-btn");
const API_KEY = "AIzaSyCbVZr_P9LZ13iBwbEtcwk1EwtXH4yHwZs";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`
let UserMessage = " ";
const chatHistory = [];
const userData = {
    message: "",
    file: {}
}
let typingInterval, controller;
function scrollToBottom() {
    container.scrollTo(
        {
            top: container.scrollHeight,
            behavior: "smooth"
        }
    );
}

function typingEffect(text, textElement, BotMsgDiv) {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            BotMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
            scrollToBottom(); // Ensure final scroll after typing completes
        }
    }, 40);
}

/**
 * Asynchronously generates a response by sending a user's message to the specified API.
 * The user's message is added to the chat history before making the API call.
 * 
 * @async
 * @function generateResponse
 * @returns {Promise<void>} A promise that resolves when the response has been processed.
 */
async function generateResponse(BotMsgDiv) {
    // add user message and file data to chat history 
    const textElement = BotMsgDiv.querySelector(".message-text");
    controller = new AbortController();
    chatHistory.push(
        {
            role: "user",
            parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
        });
    try {
        // send the chat history to get the API response 
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message)
        console.log(data)
        // process the response text and print with typing animation effect 
        const ResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        textElement.textContent = ResponseText;
        typingEffect(ResponseText, textElement, BotMsgDiv)

        chatHistory.push({ role: "model", parts: [{ text: ResponseText }] })
        console.log(chatHistory)
    }
    catch (e) {
        textElement.style.color = "red";
        textElement.textContent = error.name === "Abbort Error" ? "Response Generation Stopped" : e.message;
        BotMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
    }
    finally {
        userData.file = {};
    }
}
// Create Message Element in the Chat Container
function createMsgElement(content, ...className) {
    const div = document.createElement("div");
    div.classList.add("message", ...className);
    div.innerHTML = content;
    return div;
}
// handle the form submission 
const handleFormSubmit = (e) => {
    e.preventDefault();
    const UserMessage = promptInput.value.trim();
    if (!UserMessage || document.body.classList.contains("bot-responding")) return;

    userData.message = UserMessage;
    promptInput.value = "";
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
    // Create User HTML with optional file and image attachment 
    const UsermsgHTML = `<p class="message-text"></p>
    ${userData.file.data ?
            (userData.file.isImage ?
                `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>`
                :
                `<p class="file-attachment" ><span class= "material-symbols-rounded">description</span>
                ${userData.file.fileName}</p>`)
            :
            ""}`

    const Usermsgdiv = createMsgElement(UsermsgHTML, "user-message");

    Usermsgdiv.querySelector(".message-text").textContent = UserMessage;

    chatContainer.appendChild(Usermsgdiv);
    scrollToBottom();
    // Generate Bot Message HTML AND Add in the chat Container after 600ms
    setTimeout(() => {
        const BotMsgHTML = `<img class="avatar" src="gemini-chatbot-logo.svg">
                <p class="message-text">Just a sec...</p>`;
        const BotMsgDiv = createMsgElement(BotMsgHTML, "bot-message", "loading");
        chatContainer.appendChild(BotMsgDiv);
        scrollToBottom();
        generateResponse(BotMsgDiv);
    }, 600);

}
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/") // Check if the file is an image by using its MIME type
    const reader = new FileReader();
    reader.readAsDataURL(file); // Read the file as a Data URL
    // Handle the file read event
    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
        //Store File Data in UserData Object 
        userData.file = {
            fileName: file.name,
            data: base64String,
            mime_type: file.type,
            isImage
        };
    }
})
// Clear file data when cancel button is clicked
document.querySelector("#cancel-button-file").addEventListener("click", () => {
    userData.file = {}; // clear file data when cancel button is clicked
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});
// Send prompt to AI when form is submitted
promptForm.addEventListener("submit", handleFormSubmit);
// Add file when add button is clicked
promptForm.querySelector("#add-button-file").addEventListener("click", () => fileInput.click());
// Stop response OF AI when stop response button is clicked
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {}; // clear file data when cancel button is clicked
    controller?.abort(); // abort the fetch request
    chatContainer.querySelector(".bot-message.loading").remove("loading");
    document.body.classList.remove("bot-responding");
    clearInterval(typingInterval); // clear the typing interval because the response is stopped
})
// delete button event to remove all chats with AI
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatContainer.innerHTML = "";
    chatHistory.length = 0;
    document.body.classList.remove("bot-responding", "chats-active");
})
// dark and light theme toggle
themetoggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("theme-color", isLightTheme ? "light-theme" : "dark-theme"); themetoggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
})
// set initial theme 
const isLightTheme = localStorage.getItem("theme-color") === "light-theme";
document.body.classList.toggle("light-theme", isLightTheme);
themetoggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

// handle suggesstion click
document.querySelectorAll(".suggestions-item").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    })
})
// -----------------Remove button for input prompt in Mobile view----------------
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || target.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn");
    wrapper.classList.toggle("hide-controls", shouldHide);
})
// --------------------Navbar Toggle------------------
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});