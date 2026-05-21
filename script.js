document.addEventListener('DOMContentLoaded', () => {
    // 1. Data and State
    let tasks = JSON.parse(localStorage.getItem('premium-tasks')) || [];
    let currentFilter = 'all'; // all | pending | completed
    let searchQuery = '';

    // Theme State
    let isLightMode = localStorage.getItem('theme-mode') === 'light';
    if (isLightMode) document.body.classList.add('light-mode');
    updateThemeIcon();

    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const emptyStateMsg = document.getElementById('emptyStateMsg');
    const taskStats = document.getElementById('taskStats');
    const progressBar = document.getElementById('progressBar');
    const searchInput = document.getElementById('searchInput');
    const themeToggle = document.getElementById('themeToggle');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Date Elements
    const dayNumber = document.getElementById('dayNumber');
    const monthYear = document.getElementById('monthYear');
    const dayName = document.getElementById('dayName');

    // Initialize App
    function init() {
        setDate();
        renderTasks();
        requestNotificationPermission();

        // SortableJS Drag & Drop
        if (typeof Sortable !== 'undefined') {
            new Sortable(taskList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function (evt) {
                    // Reorder the backing array
                    const itemEl = evt.item;
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;

                    // We need to map visible elements to actual tasks if filtered, 
                    // but manual rearranging works best on 'all' view.
                    if (currentFilter === 'all' && searchQuery === '') {
                        const moved = tasks.splice(oldIndex, 1)[0];
                        tasks.splice(newIndex, 0, moved);
                        saveTasks();
                    }
                },
            });
        }

        // Event Listeners
        addBtn.addEventListener('click', handleAddTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddTask();
        });

        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderTasks();
        });

        themeToggle.addEventListener('click', () => {
            isLightMode = !isLightMode;
            document.body.classList.toggle('light-mode', isLightMode);
            localStorage.setItem('theme-mode', isLightMode ? 'light' : 'dark');
            updateThemeIcon();
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                const target = e.target;
                target.classList.add('active');
                currentFilter = target.dataset.filter;
                renderTasks();
            });
        });

        taskList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const id = Number(deleteBtn.dataset.id);
                handleDelete(id, deleteBtn.closest('.task-item'));
                return;
            }
            const taskContent = e.target.closest('.task-content');
            if (taskContent) {
                const id = Number(taskContent.dataset.id);
                handleToggle(id);
            }
        });
    }

    // Handlers
    function setDate() {
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        dayNumber.textContent = today.getDate().toString().padStart(2, '0');
        monthYear.textContent = `${months[today.getMonth()]} ${today.getFullYear()}`;
        dayName.textContent = days[today.getDay()];
    }

    function updateThemeIcon() {
        const icon = document.getElementById('themeIcon');
        icon.name = isLightMode ? 'moon-outline' : 'sunny-outline';
    }

    function getFormattedTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    function sendNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    const priorityValues = { 'high': 3, 'medium': 2, 'low': 1 };

    function handleAddTask() {
        const text = taskInput.value.trim();
        if (!text) return;

        const priority = prioritySelect.value;
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            timeCreated: getFormattedTime(),
            priority: priority
        };

        // Push and sort immediately by priority so important tasks jump to top
        tasks.push(newTask);
        tasks.sort((a, b) => priorityValues[b.priority] - priorityValues[a.priority]);

        saveTasks();

        taskInput.value = '';
        taskInput.focus();

        renderTasks();
    }

    function handleToggle(id) {
        let toggledTask = null;
        tasks = tasks.map(task => {
            if (task.id === id) {
                toggledTask = { ...task, completed: !task.completed };
                return toggledTask;
            }
            return task;
        });
        saveTasks();
        renderTasks();

        if (toggledTask && toggledTask.completed) {
            sendNotification('Task Completed! 🎉', `You finished: ${toggledTask.text}`);
        }
    }

    function handleDelete(id, taskElement) {
        taskElement.classList.add('removing');
        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== id);
            saveTasks();
            renderTasks();
        }, 300);
    }

    function saveTasks() {
        localStorage.setItem('premium-tasks', JSON.stringify(tasks));
        updateStats();
    }

    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        taskStats.textContent = `${completed} / ${total}`;

        const percentage = total === 0 ? 0 : (completed / total) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    function renderTasks() {
        updateStats();
        taskList.innerHTML = '';

        // Apply Filters & Search
        let filteredTasks = tasks.map(t => t); // clone array map

        if (currentFilter === 'pending') {
            filteredTasks = filteredTasks.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(t => t.completed);
        }

        if (searchQuery) {
            filteredTasks = filteredTasks.filter(t => t.text.toLowerCase().includes(searchQuery));
        }

        // Show/Hide Empty State
        if (filteredTasks.length === 0) {
            emptyState.style.display = 'flex';
            taskList.style.display = 'none';
            if (tasks.length === 0) emptyStateMsg.textContent = "No tasks yet. Add one above!";
            else emptyStateMsg.textContent = "No tasks match your filters.";
            return;
        } else {
            emptyState.style.display = 'none';
            taskList.style.display = 'flex';
        }

        // Render
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;

            // Map priority to readable format
            let priorityBadge = '';
            if (task.priority === 'high') priorityBadge = `<span class="priority-badge priority-high">High</span>`;
            else if (task.priority === 'medium') priorityBadge = `<span class="priority-badge priority-medium">Med</span>`;
            else if (task.priority === 'low') priorityBadge = `<span class="priority-badge priority-low">Low</span>`;

            li.innerHTML = `
                <div class="task-content" data-id="${task.id}">
                    <div class="checkbox-container">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} tabindex="-1">
                        <ion-icon name="checkmark-outline"></ion-icon>
                    </div>
                    <div class="task-details">
                        <span class="task-text">${escapeHTML(task.text)}</span>
                        <div class="task-meta">
                            ${priorityBadge}
                            <span>${task.timeCreated || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                <button class="delete-btn" data-id="${task.id}" aria-label="Delete task">
                    <ion-icon name="trash-outline"></ion-icon>
                </button>
            `;
            taskList.appendChild(li);
        });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    init();
});
