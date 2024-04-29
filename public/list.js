document.getElementById('list-button').addEventListener('click', function () {
    document.getElementById('map').style.display = 'none';
    document.getElementById('list').style.display = 'block';
    fetchCrimesList();
});

function fetchCrimesList() {
    fetch('/crimes')
        .then(response => response.json())
        .then(data => {
            console.log(data); // Add this line
            crimesData = data;
            updateCrimes();
        });
}

function showCrimeModal(crime) {
    console.log(crime.crimeScene);
    document.getElementById('modal-title').textContent = crime.type;
    document.getElementById('modal-severity').textContent = `Severity: ${crime.severity}`;
    document.getElementById('modal-category').textContent = `Category: ${crime.category}`;
    document.getElementById('modal-description').textContent = `Description: ${crime.description}`;
    document.getElementById('modal-suspects').textContent = `Suspects: ${crime.suspects.map(suspect => suspect.name).join(', ')}`;
    if (crime.crimeScene) {
        document.getElementById('modal-crimeScene').textContent = `Crime Scene: ${crime.crimeScene.location}, ${crime.crimeScene.description}, Evidence Found: ${crime.crimeScene.foundEvidence}`;
    } else {
        document.getElementById('modal-crimeScene').textContent = 'No crime scene information available';
    }
    // Show the modal
    document.getElementById('crimeModal').style.display = "block";
}

document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('crimeModal').style.display = "none";
});

function updateList(data) {
    const list = document.getElementById('list');
    list.innerHTML = '';
    data.forEach(crime => {
        const listItem = document.createElement('div');
        listItem.className = 'p-6 px-8 mb-4 bg-white rounded shadow-lg'; 
        listItem.innerHTML = `
            <h2 class="font-bold text-xl mb-2">${crime.type}</h2>
            <p class="text-gray-700"><span class="font-semibold">Severity:</span> ${crime.severity}</p>
            <p class="text-gray-700"><span class="font-semibold">Suspects:</span> ${crime.suspects.map(suspect => suspect.name).join(', ')}</p>
            <button class="mt-4 px-4 py-2 bg-blue-500 text-white rounded see-more">See more</button>
        `;
        list.appendChild(listItem);

        listItem.querySelector('.see-more').addEventListener('click', function() {
            showCrimeModal(crime);
        });
    });
}

document.getElementById('search-bar').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredData = crimesData.filter(crime =>
        crime.type.toLowerCase().includes(searchTerm) ||
        String(crime.severity).toLowerCase().includes(searchTerm) ||
        crime.suspects.some(suspect => suspect.name.toLowerCase().includes(searchTerm))
    );
    updateList(filteredData);
    updateMarkers(filteredData);
});

function updateCrimes() {
    const sortOrder = document.getElementById('sort-order').value;
    const sortCategory = document.getElementById('sort-category').value;

    let filteredData = crimesData;

    // Filter by category
    if (sortCategory) {
        filteredData = filteredData.filter(crime => crime.category === sortCategory);
    }

    // Sort by severity
    filteredData.sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.severity - b.severity;
        } else {
            return b.severity - a.severity;
        }
    });

    updateList(filteredData);
    updateMarkers(filteredData);
}

document.getElementById('sort-order').addEventListener('change', updateCrimes);
document.getElementById('sort-category').addEventListener('change', updateCrimes);


fetchCrimesList();
window.showCrimeModal = showCrimeModal;