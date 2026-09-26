// ===============================
// PERSONAL FILE INTELLIGENCE
// script.js
// ===============================


// -------------------------------
// 1. SEARCH DOCUMENTS
// -------------------------------

const searchInput = document.querySelector(".search-box input");
const documentCards = document.querySelectorAll(".document-card");

searchInput.addEventListener("input", function () {

    const searchText = searchInput.value.toLowerCase();

    documentCards.forEach(function (card) {

        const fileName = card
            .querySelector(".file-info h3")
            .textContent
            .toLowerCase();

        if (fileName.includes(searchText)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }

    });

});


// -------------------------------
// 2. UPLOAD DOCUMENT
// -------------------------------

const uploadButton = document.querySelector(".upload-button");

// Create hidden file input
const fileInput = document.createElement("input");

fileInput.type = "file";

fileInput.accept = ".pdf,.docx,.txt";

fileInput.multiple = true;

fileInput.style.display = "none";

document.body.appendChild(fileInput);


// When user clicks Upload Document
uploadButton.addEventListener("click", function () {

    fileInput.click();

});


// -------------------------------
// 3. HANDLE SELECTED FILES
// -------------------------------

fileInput.addEventListener("change", function () {

    const files = fileInput.files;

    if (files.length === 0) {
        return;
    }

    for (let file of files) {

        const fileName = file.name;

        const fileSize = file.size;

        console.log("File selected:", fileName);

        console.log(
            "File size:",
            formatFileSize(fileSize)
        );

    }

    alert(
        files.length +
        " file(s) selected successfully!"
    );

});


// -------------------------------
// 4. FILE SIZE FORMATTER
// -------------------------------

function formatFileSize(bytes) {

    if (bytes < 1024) {
        return bytes + " Bytes";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// -------------------------------
// 5. AI ASSISTANT BUTTON
// -------------------------------

const aiButton = document.querySelector(".ai-button");

aiButton.addEventListener("click", function () {

    alert(
        "AI Assistant will be available after we connect the backend."
    );

});


// -------------------------------
// 6. NAVIGATION
// -------------------------------

const navItems = document.querySelectorAll(".nav-item");

navItems.forEach(function (item) {

    item.addEventListener("click", function (event) {

        event.preventDefault();

        // Remove active class
        navItems.forEach(function (nav) {
            nav.classList.remove("active");
        });

        // Add active class
        item.classList.add("active");

        console.log(
            "Clicked:",
            item.textContent.trim()
        );

    });

});


// -------------------------------
// 7. VIEW ALL BUTTON
// -------------------------------

const viewAllButton = document.querySelector(".view-all");

viewAllButton.addEventListener("click", function () {

    alert(
        "My Files page will be created next."
    );

});