let timelineOffset = 0;
const timelineLimit = 15; // Количество событий за одну выгрузку
let isLoadingTimeline = false;
let hasMoreTimeline = true;



// ===== ЗАГРУЗКА СТРАНИЦЫ ТАЙМЛАЙНА =====
window.loadTimeline = async function() {
    document.body.setAttribute('data-page', 'timeline');
    const content = document.getElementById("content");
    if (!content) return;
    // Внедрение стрелок и контейнера
    content.innerHTML = `
        <button class="nav-arrow timeline-arrow left-arrow" onclick="window.scrollTimeline(-1)">&#10094;</button>
        <div class="timeline-wrapper" id="timelineList"></div>
        <button class="nav-arrow timeline-arrow right-arrow" onclick="window.scrollTimeline(1)">&#10095;</button>
    `;
    timelineOffset = 0;
    isLoadingTimeline = false;
    hasMoreTimeline = true;
    await fetchTimelineBatch(true);
    const list = document.getElementById("timelineList");
    if (list) {
        list.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                list.scrollLeft += e.deltaY;
            }
        });
        list.removeEventListener('scroll', handleTimelineScroll);
        list.addEventListener('scroll', handleTimelineScroll);
    }
};

// Функция прокрутки таймлайна стрелками
window.scrollTimeline = function(direction) {
    const list = document.getElementById("timelineList");
    if (list) {
        // Прокрутка на 450px (ширина одного события) с плавной анимацией
        list.scrollBy({ left: direction * 450, behavior: 'smooth' });
    }
};

// Функция загрузки порции данных
window.fetchTimelineBatch = async function(isFirstLoad = false) {
    if (isLoadingTimeline || !hasMoreTimeline) return;
    isLoadingTimeline = true;
    // Сужение выборки (только нужные колонки) и ограничение диапазона
    const { data, error } = await window.db
        .from('timeline')
        .select('id, event_date, title, description, image_url')
        .order('event_date', { ascending: true })
        .range(timelineOffset, timelineOffset + timelineLimit - 1);
    isLoadingTimeline = false;
    if (error) {
        console.error("Ошибка таймлайна:", error);
        return;
    }
    if (data.length < timelineLimit) {
        hasMoreTimeline = false; // Достигнут конец базы
    }
    if (data.length > 0) {
        await appendTimelineItems(data, timelineOffset);
        timelineOffset += timelineLimit;
    } else if (isFirstLoad) {
        document.getElementById("timelineList").innerHTML = "<p style='text-align:center;'>Событий нет</p>";
    }
};



// Функция отрисовки (добавления) событий на ось
window.appendTimelineItems = async function(data, startIndex) {
    const list = document.getElementById("timelineList");
    if (!list) return;
    for (let i = 0; i < data.length; i++) {
        const event = data[i];
        const div = document.createElement("div");
        div.className = "timeline-event";
        // 1. ЛОГИКА ТАПА (Короткое нажатие): Показывает дату
        div.onclick = function(e) {
            // Игнорируем клик, если он был по кнопке удаления
            if (e.target.closest('.timeline-delete-btn')) return; 
            // Защита: если клик произошел сразу после долгого зажатия, не показываем дату
            if (div.classList.contains('show-delete')) return;
            // Скрываем даты и кнопки удаления у всех остальных событий (оставляем только одно активным)
            document.querySelectorAll('.timeline-event').forEach(el => {
                if (el !== div) {
                    el.classList.remove('show-date');
                    el.classList.remove('show-delete');
                }
            });
            // Переключаем видимость даты для текущего события
            div.classList.toggle('show-date');
        };
        const dateParts = event.event_date.split('-');
        const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
        let imageHTML = `
            <div class="timeline-avatar empty-avatar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#f63b3e" />
                            <stop offset="100%" stop-color="#f69fda" />
                        </linearGradient>
                    </defs>
                    <path fill="url(#heartGrad)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </div>
        `; 
        if (event.image_url) {
            imageHTML = `<img src="${event.image_url}" class="timeline-avatar" loading="lazy">`;
        }
        // Вставка HTML (без старого атрибута onclick в разметке)
        div.innerHTML = `
            <div class="timeline-node">
                <div class="delete-action-container timeline-trigger-container">
                    <button class="micro-trigger-btn" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('show-action')">⋮</button>
                    <button class="timeline-delete-btn" onclick="event.stopPropagation(); window.deleteEvent(${event.id})">удалить</button>
                </div>
                ${imageHTML}
                <div class="timeline-date-overlay">${formattedDate}</div>
            </div>
            <div class="timeline-title-badge">
                <span class="timeline-title-text">${event.title}</span>
            </div>
        `;
        list.appendChild(div);
    }
};

// Переключение видимости кнопки удаления по клику
window.toggleDeleteBtn = function(element) {
    // Скрываем кнопки у всех остальных событий, оставляя только текущую
    document.querySelectorAll('.timeline-event.show-delete').forEach(el => {
        if (el !== element) el.classList.remove('show-delete');
    });
    // Переключаем видимость для нажатого события
    element.classList.toggle('show-delete');
};



// Обработчик события прокрутки внутри горизонтальной ленты
window.handleTimelineScroll = function() {
    const list = document.getElementById("timelineList");
    if (!list) return;
    const scrollLeft = list.scrollLeft;
    const scrollWidth = list.scrollWidth;
    const clientWidth = list.clientWidth;
    // Подгрузка следующих событий за 400px до правого края
    if (scrollLeft + clientWidth >= scrollWidth - 400) {
        fetchTimelineBatch();
    }
};



// ===== ДОБАВЛЕНИЕ СОБЫТИЯ =====
window.saveTimelineEvent = async function() {
    const dateInput = document.getElementById('timelineDate').value;
    const titleInput = document.getElementById('timelineTitle').value;
    const fileInput = document.getElementById('timelineFile').files[0];
    const saveBtn = document.getElementById('saveTimelineBtn');
    // Проверка обязательных полей
    if (!dateInput || !titleInput) {
        return alert("Пожалуйста, укажите дату и заголовок события!");
    }
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Сохранение...";
    }
    try {
        let imageUrl = null;
        if (fileInput) {
            const compressedFile = await window.compressImage(fileInput);
            // Получаем расширение файла (например, 'png' или 'jpg')
            const fileExt = fileInput.name.split('.').pop();
            // Генерируем чистое имя файла без пробелов и кириллицы
            const fileName = `timeline_${Date.now()}.${fileExt}`;
            const { error: storageError } = await window.db.storage
                .from('post-images')
                .upload(fileName, compressedFile);
            if (storageError) throw storageError;
            const { data: urlData } = window.db.storage.from('post-images').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }
        // Запись в базу (description: null)
        const { error: insertError } = await window.db.from('timeline').insert([{
            event_date: dateInput,
            title: titleInput,
            description: null, 
            image_url: imageUrl
        }]);
        if (insertError) throw insertError;
        window.closeTimelineModal();
        const isTimelinePage = !!document.getElementById('timelineList');
        if (isTimelinePage) {
            window.loadTimeline();
        } else {
            alert("Событие сохранено!");
        }
    } catch (err) {
        console.error("Критическая ошибка сохранения:", err);
        alert("Не удалось сохранить событие. Попробуйте еще раз.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "сохранить событие";
        }
    }
};



// ===== УДАЛЕНИЕ СОБЫТИЯ =====
window.deleteEvent = async function(id) {
    if (!confirm("Вы уверены, что хотите удалить это событие из линии времени?")) return;
    const { error } = await window.db.from('timeline').delete().eq('id', id);
    if (error) {
        console.error("Ошибка удаления:", error);
        alert("Ошибка при удалении.");
    } else {
        window.loadTimeline();
    }
};
