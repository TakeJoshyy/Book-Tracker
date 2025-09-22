let books = [];
let editingIndex = -1;
const STORAGE_KEY = 'bookTrackerData';
const THEME_KEY = 'theme';

// Load books from localStorage
function loadBooks() {
    const stored = localStorage.getItem(STORAGE_KEY);
    books = stored ? JSON.parse(stored) : [];
    displayBooks();
}

// Save books to localStorage
function saveBooks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

// Initialize theme
function initTheme() {
    let theme = localStorage.getItem(THEME_KEY);
    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : '';
    }
    if (theme) {
        document.body.classList.add('dark');
        document.querySelectorAll('#themeIcon').forEach(icon => {
            icon.src = 'sun.png';
            icon.alt = 'Dark Mode';
        });
    } else {
        document.querySelectorAll('#themeIcon').forEach(icon => {
            icon.src = 'moon.png';
            icon.alt = 'Light Mode';
        });
    }
}

// Fetch book info from Google Books API, fallback to Open Library
async function fetchBookInfo(title) {
    // Try Google Books first
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const book = data.items[0].volumeInfo;
            return {
                cover: book.imageLinks ? book.imageLinks.thumbnail : '',
                genre: book.categories ? book.categories.join(', ') : 'Unknown',
                pages: book.pageCount || 0
            };
        }
    } catch (error) {
        console.error('Error fetching book info from Google:', error);
    }
    // Fallback: Try Open Library
    try {
        const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`);
        const data = await response.json();
        if (data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            return {
                cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
                genre: doc.subject ? doc.subject.slice(0, 3).join(', ') : 'Unknown',
                pages: doc.number_of_pages_median || 0
            };
        }
    } catch (error) {
        console.error('Error fetching book info from Open Library:', error);
    }
    return { cover: '', genre: 'Unknown', pages: 0 };
}

// Display books list with filter
function displayBooks(filter = '') {
    const bookList = document.getElementById('bookList');
    if (!bookList) return;
    bookList.innerHTML = '';
    const lowerFilter = filter.toLowerCase();
    books.forEach((book, index) => {
        if (lowerFilter && !book.title.toLowerCase().includes(lowerFilter) && !book.genre.toLowerCase().includes(lowerFilter)) return;
        const card = document.createElement('div');
        card.className = 'book-card';
        const progressPercent = book.pages > 0 ? (book.currentPages / book.pages) * 100 : 0;
        card.innerHTML = `
            <img src="${book.cover || 'https://via.placeholder.com/100'}" alt="${book.title} Cover" width="100">
            <div class="book-info">
                <h3>${book.title}</h3>
                <p>Genre: ${book.genre}</p>
                <p>Pages: ${book.pages}</p>
                <p>Status: ${book.status}</p>
                ${book.status === 'reading' ? `
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progressPercent}%"></div>
                    </div>
                    <p>Progress: ${book.currentPages} / ${book.pages}</p>
                ` : ''}
                <p>Format: ${book.format}</p>
                <p>Start: ${book.startDate || 'N/A'}</p>
                <p>Finish: ${book.finishDate || 'N/A'}</p>
                <p>Score: ${book.score || 'N/A'}</p>
                <p>Comments: ${book.comments || ''}</p>
                <button onclick="editBook(${index})" aria-label="Edit ${book.title}">Edit</button>
                <button onclick="deleteBook(${index})" aria-label="Delete ${book.title}">Delete</button>
            </div>
        `;
        bookList.appendChild(card);
    });
}

// Edit book
function editBook(index) {
    editingIndex = index;
    const book = books[index];
    document.getElementById('title').value = book.title;
    document.getElementById('coverUrl').value = book.cover || '';
    document.getElementById('genreInput').value = book.genre;
    document.getElementById('pagesInput').value = book.pages;
    document.getElementById('status').value = book.status;
    document.getElementById('startDate').value = book.startDate || '';
    document.getElementById('finishDate').value = book.finishDate || '';
    document.getElementById('format').value = book.format;
    document.getElementById('currentPages').value = book.currentPages || 0;
    document.getElementById('score').value = book.score || '';
    document.getElementById('comments').value = book.comments || '';
    const preview = document.getElementById('coverPreview');
    preview.src = book.cover || '';
    preview.style.display = book.cover ? 'block' : 'none';
    toggleCurrentPages(book.status);
    updateCurrentPagesMax();
}

// Delete book
function deleteBook(index) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    books.splice(index, 1);
    saveBooks();
    displayBooks(document.getElementById('search')?.value || '');
}

// Toggle current pages field
function toggleCurrentPages(status) {
    const label = document.getElementById('currentPagesLabel');
    const input = document.getElementById('currentPages');
    if (status === 'reading') {
        label.style.display = 'block';
        input.style.display = 'block';
        updateCurrentPagesMax();
    } else {
        label.style.display = 'none';
        input.style.display = 'none';
    }
}

// Update max for currentPages
function updateCurrentPagesMax() {
    const pages = parseInt(document.getElementById('pagesInput').value) || 0;
    document.getElementById('currentPages').max = pages;
}

// Validate form
function validateForm(book) {
    if (book.currentPages > book.pages) {
        alert('Current pages cannot exceed total pages.');
        return false;
    }
    if (book.startDate && book.finishDate && new Date(book.startDate) > new Date(book.finishDate)) {
        alert('Start date cannot be after finish date.');
        return false;
    }
    if (book.score < 0 || book.score > 10) {
        alert('Score must be between 0 and 10.');
        return false;
    }
    return true;
}

// Load stats for stats.html
function loadStats() {
    loadBooks();
    document.getElementById('total').textContent = books.length;
    const finished = books.filter(b => b.status === 'finished').length;
    document.getElementById('finished').textContent = finished;
    const readingCount = books.filter(b => b.status === 'reading').length;
    document.getElementById('readingCount').textContent = readingCount;
    const scoredBooks = books.filter(b => b.score != null);
    const avgScore = scoredBooks.length ? (scoredBooks.reduce((sum, b) => sum + b.score, 0) / scoredBooks.length).toFixed(2) : 'N/A';
    document.getElementById('avgScore').textContent = avgScore;

    // Top 10 finished books by score
    const sortedBooks = books.filter(b => b.status === 'finished' && b.score != null)
                             .sort((a, b) => b.score - a.score)
                             .slice(0, 10);
    const topBooksList = document.getElementById('topBooks');
    topBooksList.innerHTML = '';
    sortedBooks.forEach(book => {
        const li = document.createElement('li');
        li.textContent = `${book.title} - Score: ${book.score}`;
        topBooksList.appendChild(li);
    });

    // Genre pie chart (count multiples)
    const genres = {};
    books.forEach(book => {
        book.genre.split(', ').forEach(g => {
            if (g && g !== 'Unknown') genres[g] = (genres[g] || 0) + 1;
        });
    });
    const ctxGenre = document.getElementById('genreChart').getContext('2d');
    new Chart(ctxGenre, {
        type: 'pie',
        data: {
            labels: Object.keys(genres),
            datasets: [{
                data: Object.values(genres),
                backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf', '#ffcd56', '#4bc0c0', '#36a2eb']
            }]
        },
        options: { responsive: true }
    });

    // Format pie chart
    const formats = {};
    books.forEach(book => {
        formats[book.format] = (formats[book.format] || 0) + 1;
    });
    const ctxFormat = document.getElementById('formatChart').getContext('2d');
    new Chart(ctxFormat, {
        type: 'pie',
        data: {
            labels: Object.keys(formats),
            datasets: [{
                data: Object.values(formats),
                backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0']
            }]
        },
        options: { responsive: true }
    });
}

// Load calendar for calendar.html
function loadCalendar() {
    loadBooks();
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: books.flatMap(book => {
            const events = [];
            if (book.startDate) {
                events.push({
                    title: `${book.title} (Started)`,
                    start: book.startDate,
                    cover: book.cover || 'https://via.placeholder.com/30',
                    extendedProps: { type: 'start' }
                });
            }
            if (book.finishDate) {
                events.push({
                    title: `${book.title} (Finished)`,
                    start: book.finishDate,
                    cover: book.cover || 'https://via.placeholder.com/30',
                    extendedProps: { type: 'finish' }
                });
            }
            return events;
        }),
        eventContent: function(arg) {
            return {
                html: `
                    <div>
                        <img src="${arg.event.extendedProps.cover}" alt="${arg.event.title}" width="30">
                        ${arg.event.title}
                    </div>
                `
            };
        }
    });
    calendar.render();
}

// Initialize on page load
initTheme();

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    console.log('Theme toggle event listener attached');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : '');
        document.querySelectorAll('#themeIcon').forEach(icon => {
            icon.src = isDark ? 'sun.png' : 'moon.png';
            icon.alt = isDark ? 'Dark Mode' : 'Light Mode';
        });
    });
}

if (document.getElementById('bookForm')) {
    loadBooks();

    // Fetch button
    document.getElementById('fetchBtn').addEventListener('click', async () => {
        const title = document.getElementById('title').value;
        if (!title) return alert('Enter a title');
        const info = await fetchBookInfo(title);
        document.getElementById('coverUrl').value = info.cover;
        document.getElementById('genreInput').value = info.genre;
        document.getElementById('pagesInput').value = info.pages;
        const preview = document.getElementById('coverPreview');
        preview.src = info.cover || '';
        preview.style.display = info.cover ? 'block' : 'none';
        updateCurrentPagesMax();
    });

    // Status change
    document.getElementById('status').addEventListener('change', (e) => {
        toggleCurrentPages(e.target.value);
    });

    // Pages input change
    document.getElementById('pagesInput').addEventListener('input', updateCurrentPagesMax);

    // Form submit
    document.getElementById('bookForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const cover = document.getElementById('coverUrl').value;
        const genre = document.getElementById('genreInput').value || 'Unknown';
        const pages = parseInt(document.getElementById('pagesInput').value) || 0;
        const status = document.getElementById('status').value;
        const startDate = document.getElementById('startDate').value || null;
        const finishDate = document.getElementById('finishDate').value || null;
        const format = document.getElementById('format').value;
        const currentPages = status === 'reading' ? parseInt(document.getElementById('currentPages').value) || 0 : 0;
        const score = parseFloat(document.getElementById('score').value) || null;
        const comments = document.getElementById('comments').value;

        const book = { title, cover, genre, pages, status, startDate, finishDate, format, currentPages, score, comments };

        if (!validateForm(book)) return;

        if (editingIndex >= 0) {
            books[editingIndex] = book;
            editingIndex = -1;
        } else {
            books.push(book);
        }

        saveBooks();
        displayBooks();
        e.target.reset();
        document.getElementById('coverPreview').style.display = 'none';
        toggleCurrentPages('not started');
    });

    // Search
    document.getElementById('search').addEventListener('input', (e) => {
        displayBooks(e.target.value);
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'books.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importInput').click();
    });
    document.getElementById('importInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                books = JSON.parse(ev.target.result);
                saveBooks();
                displayBooks();
                alert('Data imported successfully!');
            } catch (err) {
                alert('Error importing data: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
}