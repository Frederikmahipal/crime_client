document.getElementById('suspects-button').addEventListener('click', function () {
    document.getElementById('map').style.display = 'none';
    document.getElementById('list').style.display = 'none';
    document.getElementById('suspects').style.display = 'block';
    document.getElementById('toggle-most-wanted-button').style.display = 'block';
    document.getElementById('list-title').style.display = 'block';
    fetchSuspectsList();
});


let suspectsData = [];
let showMostWanted = false;

function fetchSuspectsList() {
    fetch('/suspects')
        .then(response => response.json())
        .then(data => {
            suspectsData = data;
            updateSuspects();
        });
}

function updateSuspects() {
    const sortCategory = document.getElementById('sort-category').value;

    let filteredData = suspectsData;

    if (sortCategory) {
        filteredData = filteredData.filter(suspect =>
            suspect.crimes.some(crime => crime.category === sortCategory)
        );
    }
    updateSuspectsList(filteredData);
    updateListTitle();
}

function updateSuspectsList(data) {
    const list = document.getElementById('suspects');
    list.innerHTML = '';
    data.forEach(item => {
        const name = item.name;
        const crimesCount = item.crimes.length; // Define crimesCount here
        const listItem = document.createElement('div');
        listItem.className = 'p-6 px-8 mb-4 bg-white rounded shadow-lg';
        listItem.innerHTML = `
        <h2 class="font-bold text-xl mb-2">${name}</h2>
        <p class="text-gray-700"><span class="font-semibold">Crimes:</span> ${crimesCount ? `Involved in ${crimesCount} crime(s)` : 'No crimes found'
            }</p>
        `;
        list.appendChild(listItem);
    });
}

function updateListTitle() {
    const titleElement = document.getElementById('list-title');
    titleElement.textContent = showMostWanted ? 'Most Wanted' : 'All Suspects';
}

document.getElementById('search-bar').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    let filteredData;
    if (document.getElementById('suspects').style.display === 'block') {
       
        filteredData = suspectsData.filter(suspect =>
            suspect.name.toLowerCase().includes(searchTerm) ||
            suspect.crimes.some(crime => crime.type.toLowerCase().includes(searchTerm))
        );
        updateSuspectsList(filteredData);
    } else {
      
        filteredData = crimesData.filter(crime =>
            crime.type.toLowerCase().includes(searchTerm) ||
            String(crime.severity).toLowerCase().includes(searchTerm) ||
            crime.suspects.some(suspect => suspect.name.toLowerCase().includes(searchTerm))
        );
        updateList(filteredData);
        updateMarkers(filteredData);
    }
});


document.getElementById('toggle-most-wanted-button').addEventListener('click', function () {
    showMostWanted = !showMostWanted;
    if (showMostWanted) {
        fetchMostWanted();
    } else {
        fetchSuspectsList();
    }
    updateListTitle(); 
});

function fetchMostWanted() {
    fetch('/most-wanted')
        .then(response => response.json())
        .then(data => {
            updateSuspectsList(data.map(item => {
                return {
                    ...item.suspect,
                    crimes: item.crimes
                };
            }));
            updateListTitle();
        });
}

document.getElementById('sort-category').addEventListener('change', updateSuspects);

fetchSuspectsList();