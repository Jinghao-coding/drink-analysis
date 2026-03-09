// @ts-nocheck
import './styles.css';
    // 配置
    const BIN_ID = "697e0a63d0ea881f40962da0";
    const API_KEY = "$2a$10$rvgEXLG9D/lIo3jHDDhfFeiPY00PfhQo21ZWJzVbKlpahwi33MIzG";

    const APP_SCHEMA_VERSION = 3;
    const USERS_STORAGE_KEY = 'drinkCalendarUsers';
    const THEME_STORAGE_KEY = 'drinkCalendarTheme';

    // 扩展位置以支持更多成员（动态网格）
    const POSITIONS = [
        '位置1', '位置2', '位置3', '位置4', '位置5', '位置6',
        '位置7', '位置8', '位置9', '位置10', '位置11', '位置12',
        '位置13', '位置14', '位置15', '位置16'
    ];

    // 预设颜色选项
    const COLOR_PALETTE = [
        '#8e44ad', '#9b59b6', '#3498db', '#2980b9',
        '#1abc9c', '#16a085', '#27ae60', '#2ecc71',
        '#f39c12', '#f1c40f', '#e67e22', '#d35400',
        '#e74c3c', '#c0392b', '#e91e63', '#ff5722'
    ];

    // 用户定义（使用稳定 id；数据用 id 绑定，避免重命名/删除导致历史错位）
    let USERS = [
        { id: 'u_haohao', name: '皓皓', short: '皓', color: '#8e44ad', pos: '左上' },
        { id: 'u_xiaoguo', name: '小郭', short: '郭', color: '#2980b9', pos: '右上' },
        { id: 'u_lusi', name: '路思', short: '路', color: '#d35400', pos: '左下' },
        { id: 'u_gaobo', name: '高博', short: '高', color: '#16a085', pos: '右下' }
    ];

    // Toast
    let toastTimer = null;
    function showToast(text, ms = 1800) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), ms);
    }

    // 触觉反馈
    function hapticFeedback(type = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30],
                success: [10, 50, 10],
                error: [30, 50, 30]
            };
            navigator.vibrate(patterns[type] || patterns.light);
        }
    }

    // 主题切换
    function initTheme() {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (saved === 'dark' || (saved === null && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon('dark');
        } else if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeIcon('light');
        }
    }

    function updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    window.toggleTheme = function() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        updateThemeIcon(newTheme);
        hapticFeedback('medium');
    };

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            const theme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        }
    });

    function genId() {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }
        } catch (e) {}
        return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    function serializeUsers(users) {
        return JSON.stringify((Array.isArray(users) ? users : []).map(u => ({
            id: typeof u.id === 'string' ? u.id : '',
            name: typeof u.name === 'string' ? u.name : '',
            short: typeof u.short === 'string' ? u.short : '',
            color: typeof u.color === 'string' ? u.color : '',
            pos: typeof u.pos === 'string' ? u.pos : ''
        })));
    }

    function normalizeUsers(rawUsers) {
        const input = Array.isArray(rawUsers) ? rawUsers : [];
        const normalized = input.map(u => {
            const name = String(u?.name ?? '').trim();
            const shortRaw = String(u?.short ?? '').trim();
            const short = (shortRaw || name.slice(0, 2)).slice(0, 2);
            const color = typeof u?.color === 'string' && u.color ? u.color : COLOR_PALETTE[0];
            const pos = POSITIONS.includes(u?.pos) ? u.pos : '';
            return {
                id: typeof u?.id === 'string' && u.id ? u.id : genId(),
                name: name || '未命名',
                short: short || '？',
                color,
                pos
            };
        });

        const usedIds = new Set();
        for (const u of normalized) {
            if (usedIds.has(u.id)) u.id = genId();
            usedIds.add(u.id);
        }

        const usedPos = new Set();
        for (const u of normalized) {
            if (!POSITIONS.includes(u.pos) || usedPos.has(u.pos)) u.pos = '';
            if (u.pos) usedPos.add(u.pos);
        }
        for (const u of normalized) {
            if (!u.pos) {
                const available = POSITIONS.find(p => !usedPos.has(p));
                if (available) {
                    u.pos = available;
                    usedPos.add(available);
                }
            }
        }

        const posOrder = POSITIONS.reduce((acc, p, i) => (acc[p] = i, acc), {});
        normalized.sort((a, b) => (posOrder[a.pos] ?? 99) - (posOrder[b.pos] ?? 99));

        return normalized.filter(u => POSITIONS.includes(u.pos)).slice(0, POSITIONS.length);
    }

    let localUsersUpdatedAt = 0;
    function readUsersFromLocal() {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (!raw) return { users: null, updatedAt: 0 };
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return { users: parsed, updatedAt: 0 };
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users)) {
                return { users: parsed.users, updatedAt: Number(parsed.updatedAt) || 0 };
            }
        } catch (e) {}
        return { users: null, updatedAt: 0 };
    }
    function writeUsersToLocal(updatedAt) {
        const ts = Number(updatedAt);
        localUsersUpdatedAt = Number.isFinite(ts) ? ts : Date.now();
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({
            v: APP_SCHEMA_VERSION,
            updatedAt: localUsersUpdatedAt,
            users: USERS
        }));
    }

    function getUserByPos(pos) {
        return USERS.find(u => u.pos === pos) || null;
    }

    function getUsersInPositionOrder() {
        return POSITIONS.map(p => getUserByPos(p)).filter(Boolean);
    }

    function ensureSelectionsValid() {
        const ids = new Set(USERS.map(u => u.id));
        if (filterUserId && !ids.has(filterUserId)) filterUserId = null;
        if (!reportUserId || !ids.has(reportUserId)) reportUserId = USERS[0]?.id || null;
    }

    // ==================== 人员管理功能 ====================

    let editingUserId = null;
    let selectedColor = '';

    window.openUserManage = function() {
        renderUserList();
        document.getElementById('userManageSheet').classList.add('show');
    };

    window.closeUserManage = function() {
        document.getElementById('userManageSheet').classList.remove('show');
        window.cancelUserEdit();
    };

    function renderUserList() {
        const list = document.getElementById('userList');
        const users = getUsersInPositionOrder();

        if (users.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div>暂无成员，点击下方按钮添加</div>
                </div>
            `;
            return;
        }

        list.innerHTML = users.map((user) => {
            const idx = USERS.findIndex(u => u.id === user.id);
            return `
                <div class="user-item">
                    <div class="user-item-avatar" style="background:${user.color}">
                        ${user.short}
                    </div>
                    <div class="user-item-info">
                        <div class="user-item-name">${user.name}</div>
                        <div class="user-item-position">
                            <span>📍</span>
                            <span>${user.pos}</span>
                        </div>
                    </div>
                    <div class="user-item-actions">
                        <button class="user-action-btn edit" onclick="editUser(${idx})">✏️ 编辑</button>
                        <button class="user-action-btn delete" onclick="deleteUser(${idx})">🗑️ 删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getAvailablePositions(excludeUserId = null) {
        const used = new Set(USERS.filter(u => u.id !== excludeUserId).map(u => u.pos));
        return POSITIONS.filter(p => !used.has(p));
    }

    function getSuggestedColor(excludeUserId = null) {
        const used = new Set(USERS.filter(u => u.id !== excludeUserId).map(u => u.color));
        return COLOR_PALETTE.find(c => !used.has(c)) || COLOR_PALETTE[0];
    }

    window.showAddUserForm = function() {
        // 动态网格已支持无限成员，移除四人限制
        // 但建议最多16人以保持良好的显示效果
        if (USERS.length >= 16) {
            const confirmAdd = confirm('当前已有 16 位成员，继续添加可能导致日历格子较小。\n\n是否继续添加？');
            if (!confirmAdd) return;
        }

        editingUserId = null;
        document.getElementById('formTitle').innerText = '➕ 添加新成员';
        document.getElementById('userName').value = '';
        document.getElementById('userShort').value = '';
        selectedColor = getSuggestedColor(null);

        renderColorPicker();

        document.getElementById('userForm').style.display = 'block';
        document.getElementById('addUserBtn').style.display = 'none';
    };

    window.editUser = function(idx) {
        const user = USERS[idx];
        if (!user) return;

        editingUserId = user.id;
        document.getElementById('formTitle').innerText = '✏️ 编辑成员';
        document.getElementById('userName').value = user.name;
        document.getElementById('userShort').value = user.short;
        selectedColor = user.color;

        renderColorPicker();

        document.getElementById('userForm').style.display = 'block';
        document.getElementById('addUserBtn').style.display = 'none';
    };

    window.deleteUser = function(idx) {
        const user = USERS[idx];
        if (!user) return;

        if (!confirm(`确定要删除「${user.name}」吗？\n\n删除后该成员的历史记录会保留在数据里，但将不再显示在日历/统计中。`)) {
            return;
        }

        USERS.splice(idx, 1);
        bumpUsersUpdatedAtAndPersist();
        renderUserList();
        ensureSelectionsValid();
        render();
        renderReport();
        showToast('已删除');
    };

    window.cancelUserEdit = function() {
        editingUserId = null;
        document.getElementById('userForm').style.display = 'none';
        document.getElementById('addUserBtn').style.display = 'block';
    };

    function bumpUsersUpdatedAtAndPersist() {
        USERS = normalizeUsers(USERS);
        const now = Date.now();
        writeUsersToLocal(now);
        syncUsersToAppMeta(now);
        ensureSelectionsValid();
        if (hasPulled) {
            push();
        } else {
            pendingUserPush = true;
        }
    }

    // 获取下一个可用位置
    function getNextAvailablePosition() {
        const usedPositions = new Set(USERS.map(u => u.pos));
        for (const pos of POSITIONS) {
            if (!usedPositions.has(pos)) return pos;
        }
        return `位置${USERS.length + 1}`;
    }

    window.saveUser = function() {
        const name = document.getElementById('userName').value.trim();
        const short = document.getElementById('userShort').value.trim().slice(0, 2);

        if (!name) return alert('请输入姓名');
        if (!short) return alert('请输入简称（1-2个字）');
        if (!selectedColor) return alert('请选择颜色');

        const shortDup = USERS.some(u => u.id !== editingUserId && u.short === short);
        if (shortDup) return alert('简称已被占用，请换一个（避免日历里看不清）。');

        if (!editingUserId) {
            // 自动分配位置
            const autoPosition = getNextAvailablePosition();
            USERS.push({
                id: genId(),
                name,
                short,
                color: selectedColor,
                pos: autoPosition
            });
            bumpUsersUpdatedAtAndPersist();
            renderUserList();
            window.cancelUserEdit();
            render();
            renderReport();
            showToast(`已添加（${autoPosition}）`);
            return;
        }

        const idx = USERS.findIndex(u => u.id === editingUserId);
        if (idx === -1) return;

        // 编辑时保持原位置
        USERS[idx] = { ...USERS[idx], name, short, color: selectedColor };
        bumpUsersUpdatedAtAndPersist();
        renderUserList();
        window.cancelUserEdit();
        render();
        renderReport();
        showToast('已保存');
    };

    function renderColorPicker() {
        const picker = document.getElementById('colorPicker');
        picker.innerHTML = COLOR_PALETTE.map(color => `
            <div class="color-option ${color === selectedColor ? 'selected' : ''}"
                 style="background:${color}"
                 onclick="selectColor('${color}')">
            </div>
        `).join('');
    }

    window.selectColor = function(color) {
        selectedColor = color;
        renderColorPicker();
    };

    // ==================== 数据结构与迁移 ====================

    let appData = {};
    let hasPulled = false;
    let pendingUserPush = false;

    function ensureAppMeta() {
        if (!appData || typeof appData !== 'object') appData = {};
        if (!appData._meta || typeof appData._meta !== 'object') appData._meta = {};
        if (appData._meta.schemaVersion !== APP_SCHEMA_VERSION) appData._meta.schemaVersion = APP_SCHEMA_VERSION;
    }

    function syncUsersToAppMeta(updatedAt) {
        ensureAppMeta();
        const meta = appData._meta;
        meta.users = USERS;
        meta.usersUpdatedAt = Number(updatedAt) || Date.now();
    }

    function migrateLegacyDayData(dayData) {
        const u = {};
        for (let i = 0; i < POSITIONS.length; i++) {
            const v = dayData?.[i];
            if (typeof v !== 'string' || !v) continue;
            const pos = POSITIONS[i];
            const user = getUserByPos(pos);
            if (user) u[user.id] = v;
            else u[`_legacy_${pos}`] = v;
        }

        const photos = Array.isArray(dayData?.photos) ? dayData.photos : [];
        // 保留原始的 drinks 和 extra 数据
        const drinks = dayData?.drinks && typeof dayData.drinks === 'object' ? dayData.drinks : {};
        const extra = dayData?.extra && typeof dayData.extra === 'object' ? dayData.extra : {};
        const note = typeof dayData?.note === 'string' ? dayData.note : '';
        return note ? { u, photos, drinks, extra, note } : { u, photos, drinks, extra };
    }

    function normalizeDayData(dayData) {
        if (!dayData || typeof dayData !== 'object') return { u: {}, photos: [], drinks: {}, extra: {} };

        const drinks = dayData.drinks && typeof dayData.drinks === 'object' ? dayData.drinks : {};
        const extra = dayData.extra && typeof dayData.extra === 'object' ? dayData.extra : {};
        const note = typeof dayData.note === 'string' ? dayData.note : '';
        const photos = Array.isArray(dayData.photos) ? dayData.photos : [];

        if (dayData.u && typeof dayData.u === 'object') {
            const u = {};
            for (const [k, v] of Object.entries(dayData.u)) {
                if (typeof v === 'string' && v) u[k] = v;
            }
            return note ? { u, photos, drinks, extra, note } : { u, photos, drinks, extra };
        }

        const hasLegacy = [0, 1, 2, 3].some(i => typeof dayData[i] === 'string');
        if (hasLegacy || Array.isArray(dayData.photos)) {
            // migrateLegacyDayData 现在会保留 drinks 和 extra 数据
            return migrateLegacyDayData(dayData);
        }

        // 无人员状态/照片时，也要保留 drinks/extra/note，避免迁移时被误删
        const normalized = { u: {}, photos, drinks, extra };
        if (note) normalized.note = note;
        return normalized;
    }

    function migrateAppDataToV2() {
        let changed = false;

        for (let m = 0; m < 12; m++) {
            const monthData = appData?.[m];
            if (!monthData || typeof monthData !== 'object') continue;

            for (let d = 1; d <= 31; d++) {
                const dayData = monthData?.[d];
                if (!dayData || typeof dayData !== 'object') continue;

                const alreadyV2 = dayData.u && typeof dayData.u === 'object';
                const normalized = normalizeDayData(dayData);

                // 检查是否有任何数据（包括人员状态、照片、酒类记录、费用信息）
                const hadSomething = alreadyV2 || 
                    [0, 1, 2, 3].some(i => typeof dayData[i] === 'string') || 
                    Array.isArray(dayData.photos) ||
                    (dayData.drinks && typeof dayData.drinks === 'object' && Object.keys(dayData.drinks).length > 0) ||
                    (dayData.extra && typeof dayData.extra === 'object' && Object.keys(dayData.extra).length > 0) ||
                    (typeof dayData.note === 'string' && dayData.note.trim().length > 0);
                
                // 判断是否为空：检查人员状态、照片、酒类记录、费用信息
                const hasDrinks = normalized.drinks && Object.keys(normalized.drinks).length > 0;
                const hasExtra = normalized.extra && Object.keys(normalized.extra).length > 0;
                const hasNote = typeof normalized.note === 'string' && normalized.note.trim().length > 0;
                const isEmpty = Object.keys(normalized.u).length === 0 && 
                               (!normalized.photos || normalized.photos.length === 0) &&
                               !hasDrinks && !hasExtra && !hasNote;
                
                if (hadSomething) {
                    if (isEmpty) {
                        delete monthData[d];
                        changed = true;
                    } else if (!alreadyV2 || JSON.stringify(dayData) !== JSON.stringify(normalized)) {
                        monthData[d] = normalized;
                        changed = true;
                    }
                }
            }
        }

        return changed;
    }

    function reconcileUsersFromAppData({ preferCloud } = { preferCloud: false }) {
        ensureAppMeta();
        const meta = appData._meta;
        const cloudUsersRaw = Array.isArray(meta.users) ? meta.users : null;
        const cloudUpdatedAt = Number(meta.usersUpdatedAt) || 0;

        const localUsersRaw = USERS;
        const localUpdatedAt = localUsersUpdatedAt || 0;

        if (cloudUsersRaw) {
            const cloudUsersNormalized = normalizeUsers(cloudUsersRaw);
            const cloudUsersSerialized = serializeUsers(cloudUsersRaw);
            const cloudNormalizedSerialized = serializeUsers(cloudUsersNormalized);
            const cloudNeedsPush = cloudUsersSerialized !== cloudNormalizedSerialized;

            if (preferCloud || cloudUpdatedAt >= localUpdatedAt) {
                USERS = mergeUsers(cloudUsersNormalized, localUsersRaw);
                localUsersUpdatedAt = cloudUpdatedAt;
                writeUsersToLocal(localUsersUpdatedAt);
                meta.users = USERS;
                meta.usersUpdatedAt = localUsersUpdatedAt;
                return cloudNeedsPush || cloudUpdatedAt === 0 || JSON.stringify(cloudUsersNormalized) !== JSON.stringify(USERS);
            }

            USERS = mergeUsers(localUsersRaw, cloudUsersNormalized);
            const now = localUpdatedAt || Date.now();
            writeUsersToLocal(now);
            meta.users = USERS;
            meta.usersUpdatedAt = now;
            return true;
        }

        USERS = normalizeUsers(localUsersRaw);
        const now = localUpdatedAt || Date.now();
        writeUsersToLocal(now);
        meta.users = USERS;
        meta.usersUpdatedAt = now;
        return true;
    }

    function mergeUsers(primary, secondary) {
        const merged = normalizeUsers(primary);
        const primaryIds = new Set(merged.map(u => u.id));
        
        for (const user of secondary) {
            if (!primaryIds.has(user.id)) {
                merged.push(normalizeUser(user));
            }
        }
        
        return merged;
    }

    function normalizeUser(user) {
        if (!user || typeof user !== 'object') {
            return { id: genId(), name: '未知', short: '?', color: '#888888', pos: '位置1' };
        }
        return {
            id: String(user.id) || genId(),
            name: String(user.name || '').slice(0, 20) || '未知',
            short: String(user.short || '').slice(0, 2) || '?',
            color: String(user.color || '#888888'),
            pos: String(user.pos || '位置1')
        };
    }

    // ==================== 日期/农历 ====================

    const LunarUtils = (() => {
        let fmt = null;
        try {
            fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' });
            fmt.format(new Date());
        } catch (e) {
            fmt = null;
        }

        const fallback2026 = {
            '1-25': '腊八节',
            '2-16': '除夕',
            '2-17': '春节',
            '3-3': '元宵节',
            '6-19': '端午节',
            '9-25': '中秋节',
            '10-17': '重阳节'
        };

        function parts(date) {
            if (!fmt) return null;
            const p = fmt.formatToParts(date);
            const monthText = p.find(x => x.type === 'month')?.value;
            const dayNum = Number(p.find(x => x.type === 'day')?.value);
            if (!monthText || !dayNum) return null;
            const isLeapMonth = monthText.includes('闰');

            const monthTextNoLeap = monthText.replace('闰', '');
            const monthMap = { '正月': 1, '二月': 2, '三月': 3, '四月': 4, '五月': 5, '六月': 6, '七月': 7, '八月': 8, '九月': 9, '十月': 10, '十一月': 11, '腊月': 12 };
            const monthNum = monthMap[monthTextNoLeap] || 0;

            return { monthText, monthNum, dayNum, isLeapMonth };
        }

        function dayToCn(n) {
            const num = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
            if (n <= 10) return '初' + num[n];
            if (n < 20) return '十' + num[n - 10];
            if (n === 20) return '二十';
            if (n < 30) return '廿' + num[n - 20];
            return '三十';
        }

        function getLunarText(year, month0, day) {
            const p = parts(new Date(year, month0, day));
            if (!p) return '';
            return `${p.monthText}${dayToCn(p.dayNum)}`;
        }

        function getFestival(year, month0, day) {
            const date = new Date(year, month0, day);
            const p = parts(date);
            if (!p) {
                if (year === 2026) {
                    const key = `${month0 + 1}-${day}`;
                    return fallback2026[key] || '';
                }
                return '';
            }

            if (!p.isLeapMonth) {
                if (p.monthNum === 1 && p.dayNum === 1) return '春节';
                if (p.monthNum === 1 && p.dayNum === 15) return '元宵节';
                if (p.monthNum === 5 && p.dayNum === 5) return '端午节';
                if (p.monthNum === 8 && p.dayNum === 15) return '中秋节';
                if (p.monthNum === 9 && p.dayNum === 9) return '重阳节';
                if (p.monthNum === 12 && p.dayNum === 8) return '腊八节';
            }

            if (!p.isLeapMonth && p.monthNum === 12) {
                const next = new Date(date);
                next.setDate(date.getDate() + 1);
                const np = parts(next);
                if (np && !np.isLeapMonth && np.monthNum === 1 && np.dayNum === 1) return '除夕';
            }

            return '';
        }

        return { getLunarText, getFestival };
    })();

    const DateUtils = {
        getWeekDay(year, month, day) {
            const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
            const date = new Date(year, month, day);
            return '星期' + weekDays[date.getDay()];
        },

        isWeekend(year, month, day) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            return dayOfWeek === 0 || dayOfWeek === 6;
        },

        getWeekRange(year, month, day) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay() || 7;
            const monday = new Date(date);
            monday.setDate(date.getDate() - (dayOfWeek - 1));
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(0, 0, 0, 0);
            return { startDate: monday, endDate: sunday };
        },

        getHolidayInfo(year, month, day) {
            const solar = {
                '1-1': '元旦',
                '2-14': '情人节',
                '3-8': '妇女节',
                '4-4': '清明节',
                '4-5': '清明节',
                '5-1': '劳动节',
                '6-1': '儿童节',
                '9-10': '教师节',
                '10-1': '国庆节',
                '12-25': '圣诞节',
                '12-31': '跨年夜'
            };

            const key = `${month + 1}-${day}`;
            const solarHoliday = solar[key] || '';
            const lunarHoliday = LunarUtils.getFestival(year, month, day);
            const lunarText = LunarUtils.getLunarText(year, month, day);
            return { solarHoliday, lunarHoliday, lunarText };
        }
    };

    // ==================== 状态/统计 ====================

    // 状态定义
    const STATUS_MAP = {
        '': { cls: '' },
        '微醺': { cls: 'bg-tipsy', val: 1 },
        '刚刚好': { cls: 'bg-good', val: 2 },
        '醉了': { cls: 'bg-drunk', val: 3 }
    };
    const OPTS = ['', '微醺', '刚刚好', '醉了'];

    // 酒类定义
    const DRINK_TYPES = {
        '白酒': { icon: '🍶', unit: '两', color: '#f1c40f' },
        '啤酒': { icon: '🍺', unit: '瓶', color: '#f39c12' },
        '红酒': { icon: '🍷', unit: '杯', color: '#9b59b6' },
        '威士忌': { icon: '🥃', unit: '杯', color: '#d35400' },
        '清酒': { icon: '🍶', unit: '合', color: '#ecf0f1' },
        '鸡尾酒': { icon: '🍸', unit: '杯', color: '#e91e63' },
        '黄酒': { icon: '🍶', unit: '碗', color: '#c0392b' },
        '其他': { icon: '🥤', unit: '杯', color: '#95a5a6' }
    };
    const DRINK_TYPE_NAMES = Object.keys(DRINK_TYPES);

    // 年份和月份管理
    const now = new Date();
    let curYear = now.getFullYear();
    let curMonth = now.getMonth();
    let editDay = 1;
    let tempEdit = {}; // userId -> status
    let tempPhotos = []; // 临时存储当天照片
    let tempExtra = {}; // userId -> { amount, unit, cost, drinks: [{type, amount}] }
    let tempDrinks = {}; // userId -> [{ type: '白酒', amount: 2 }, ...]
    let filterUserId = null; // null表示不筛选
    let reportUserId = null; // 当前查看的年度报告用户

    // 获取网格类名（根据人数动态调整）
    function getGridClass(userCount) {
        if (userCount <= 0) return 'grid-1';
        if (userCount <= 16) return `grid-${userCount}`;
        return 'grid-16'; // 超过16人使用16宫格
    }

    // 获取状态点大小类名
    function getSizeClass(userCount) {
        if (userCount <= 0) return 'size-1';
        if (userCount <= 16) return `size-${userCount}`;
        return 'size-16';
    }

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();

        const local = readUsersFromLocal();
        if (local.users) {
            USERS = normalizeUsers(local.users);
            const ts = Number(local.updatedAt);
            localUsersUpdatedAt = Number.isFinite(ts) ? ts : 0;
            writeUsersToLocal(localUsersUpdatedAt);
        } else {
            USERS = normalizeUsers(USERS);
            localUsersUpdatedAt = 0;
            writeUsersToLocal(localUsersUpdatedAt);
        }

        ensureSelectionsValid();
        render();
        renderReport();
        pull();

        let lastPullTime = Date.now();
        setInterval(() => {
            const now = Date.now();
            if (now - lastPullTime >= 30000) {
                lastPullTime = now;
                pull();
            }
        }, 10000);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                pull();
                lastPullTime = Date.now();
            }
        });

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.opt-btn');
            if (btn) {
                const userId = btn.dataset.userId;
                const value = btn.dataset.v;
                if (userId !== undefined) {
                    setOpt(userId, value);
                }
            }
        });
    });

    function chMonth(d) {
        let n = curMonth + d;
        if (n < 0) {
            curYear--;
            curMonth = 11;
        } else if (n > 11) {
            curYear++;
            curMonth = 0;
        } else {
            curMonth = n;
        }
        render();
    }

    function chYear(d) {
        curYear += d;
        render();
        renderReport();
    }

    // 年份选择器内的切换
    let selectorYear = curYear;
    window.chYearInSelector = function(d) {
        selectorYear += d;
        document.getElementById('selectorYear').innerText = selectorYear;
        renderMonthGridWithYear(selectorYear);
    };

    // 月份跳转功能
    window.toggleMonthSelector = function() {
        const selector = document.getElementById('monthSelector');
        const isShowing = selector.classList.contains('show');

        if (isShowing) {
            selector.classList.remove('show');
        } else {
            // 初始化选择器年份为当前年份
            selectorYear = curYear;
            document.getElementById('selectorYear').innerText = selectorYear;
            renderMonthGridWithYear(selectorYear);
            selector.classList.add('show');
        }
    }

    function renderMonthGridWithYear(year) {
        const monthGrid = document.getElementById('monthGrid');
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        let html = '';
        monthNames.forEach((name, index) => {
            const isActive = (year === curYear && index === curMonth) ? 'active' : '';
            html += `<div class="month-item ${isActive}" onclick="jumpToMonthWithYear(${index}, ${year})">${name}</div>`;
        });

        monthGrid.innerHTML = html;
    }

    window.jumpToMonthWithYear = function(monthIndex, year) {
        curYear = year;
        curMonth = monthIndex;
        render();
        renderReport();
        // 关闭选择器
        document.getElementById('monthSelector').classList.remove('show');
    };

    window.jumpToMonth = function(monthIndex) {
        curMonth = monthIndex;
        render();
        // 关闭选择器
        document.getElementById('monthSelector').classList.remove('show');
    };

    function renderMonthGrid() {
        const monthGrid = document.getElementById('monthGrid');
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        let html = '';
        monthNames.forEach((name, index) => {
            const isActive = index === curMonth ? 'active' : '';
            html += `<div class="month-item ${isActive}" onclick="jumpToMonth(${index})">${name}</div>`;
        });
        monthGrid.innerHTML = html;
    }

    // 点击外部关闭月份选择器
    document.addEventListener('click', function(e) {
        const selector = document.getElementById('monthSelector');
        const monthTxt = document.getElementById('monthTxt');
        
        if (selector && monthTxt && 
            !selector.contains(e.target) && 
            !monthTxt.contains(e.target)) {
            selector.classList.remove('show');
        }
    });

    const StatsUtils = {
        getDayRecordCount(month, day) {
            const dayData = appData?.[month]?.[day];
            if (!dayData || typeof dayData !== 'object') return 0;
            const u = dayData.u && typeof dayData.u === 'object' ? dayData.u : {};
            const activeIds = USERS.map(x => x.id);
            let count = 0;
            for (const id of activeIds) {
                if (u[id]) count++;
            }
            return count;
        },

        getUserStatsInRange(userId, startDate, endDate) {
            let count = 0;
            const details = { '微醺': 0, '刚刚好': 0, '醉了': 0 };

            const cur = new Date(startDate);
            cur.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(0, 0, 0, 0);

            while (cur <= end) {
                const m = cur.getMonth();
                const d = cur.getDate();
                const status = appData?.[m]?.[d]?.u?.[userId];
                if (status) {
                    count++;
                    if (details[status] !== undefined) details[status]++;
                }
                cur.setDate(cur.getDate() + 1);
            }

            return { total: count, details };
        },

        getWeekStats(year, month, day, userId) {
            const range = DateUtils.getWeekRange(year, month, day);
            return this.getUserStatsInRange(userId, range.startDate, range.endDate);
        },

        getMonthStats(year, month, userId) {
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            return this.getUserStatsInRange(userId, start, end);
        },

        getConsecutiveDays(year, month, day, userId) {
            let consecutive = 0;
            const cur = new Date(year, month, day);
            cur.setHours(0, 0, 0, 0);
            while (consecutive < 370) {
                const m = cur.getMonth();
                const d = cur.getDate();
                const status = appData?.[m]?.[d]?.u?.[userId];
                if (!status) break;
                consecutive++;
                cur.setDate(cur.getDate() - 1);
            }
            return consecutive;
        }
    };

    function getMonthDrinkStatsSummary() {
        const drinkStats = {};
        DRINK_TYPE_NAMES.forEach(t => drinkStats[t] = { count: 0, amount: 0 });

        const personStats = {};
        USERS.forEach(u => {
            personStats[u.id] = {
                user: u,
                totalCount: 0,
                totalAmount: 0,
                byType: {},
                entries: []
            };
            DRINK_TYPE_NAMES.forEach(t => personStats[u.id].byType[t] = { count: 0, amount: 0 });
        });

        const tDays = new Date(curYear, curMonth + 1, 0).getDate();
        for (let d = 1; d <= tDays; d++) {
            const dayData = normalizeDayData(appData?.[curMonth]?.[d]);
            if (!dayData?.drinks) continue;

            Object.entries(dayData.drinks).forEach(([userId, drinks]) => {
                if (!Array.isArray(drinks) || !personStats[userId]) return;

                const validDrinks = drinks.filter(drink =>
                    drink &&
                    typeof drink.type === 'string' &&
                    drink.type &&
                    Number(drink.amount) > 0 &&
                    drinkStats[drink.type]
                ).map(drink => ({
                    type: drink.type,
                    amount: Number(drink.amount)
                }));

                if (validDrinks.length === 0) return;

                let dayTotalAmount = 0;
                validDrinks.forEach(drink => {
                    drinkStats[drink.type].count++;
                    drinkStats[drink.type].amount += drink.amount;
                    personStats[userId].totalCount++;
                    personStats[userId].totalAmount += drink.amount;
                    dayTotalAmount += drink.amount;

                    if (personStats[userId].byType[drink.type]) {
                        personStats[userId].byType[drink.type].count++;
                        personStats[userId].byType[drink.type].amount += drink.amount;
                    }
                });

                personStats[userId].entries.push({
                    day: d,
                    dateLabel: `${curMonth + 1}月${d}日`,
                    totalAmount: dayTotalAmount,
                    drinks: validDrinks
                });
            });
        }

        Object.values(personStats).forEach(person => {
            person.entries.sort((a, b) => b.day - a.day);
        });

        return { drinkStats, personStats };
    }

    function renderDrinkPersonStatsHTML(contentId, persons, selectedUserId, sortBy = 'count', filterBy = 'all') {
        let filteredPersons = [...persons];
        if (filterBy !== 'all') {
            filteredPersons = filteredPersons.filter(p => p.user.id === filterBy);
        }

        filteredPersons.sort((a, b) => {
            if (sortBy === 'count') return b.totalCount - a.totalCount;
            if (sortBy === 'amount') return b.totalAmount - a.totalAmount;
            if (sortBy === 'name') return a.user.name.localeCompare(b.user.name, 'zh-CN');
            return 0;
        });

        if (filteredPersons.length === 0) {
            return '<div class="drink-person-empty">暂无匹配的人员数据</div>';
        }

        return filteredPersons.map(p => {
            const drinkTags = Object.entries(p.byType)
                .filter(([_, s]) => s.count > 0)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 3)
                .map(([type, s]) => {
                    const info = DRINK_TYPES[type] || DRINK_TYPES['其他'];
                    return `<span class="drink-person-tag"><span class="icon">${info.icon}</span>${type} ${s.count}次 ${s.amount}${info.unit}</span>`;
                }).join('');

            return `
                <div class="drink-person-row ${selectedUserId === p.user.id ? 'active' : ''}" onclick="selectDrinkPersonDetail('${contentId}', '${p.user.id}')">
                    <div class="drink-person-avatar" style="background:${p.user.color};">${p.user.name[0]}</div>
                    <div class="drink-person-info">
                        <div class="drink-person-name">${p.user.name}</div>
                        <div class="drink-person-details">
                            ${drinkTags || '<span class="drink-person-tag">暂无分类</span>'}
                        </div>
                    </div>
                    <div class="drink-person-total">
                        <div class="drink-person-count">${p.totalCount}</div>
                        <div class="drink-person-count-label">饮酒次数</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderDrinkPersonDetailHTML(person) {
        if (!person || !Array.isArray(person.entries) || person.entries.length === 0) {
            return '<div class="drink-person-detail-empty">这个月还没有酒类明细</div>';
        }

        return `
            <div class="drink-person-detail-list">
                ${person.entries.map(entry => `
                    <div class="drink-person-detail-entry">
                        <div class="drink-person-detail-head">
                            <div class="drink-person-detail-date">${entry.dateLabel}</div>
                            <div class="drink-person-detail-total">共 ${entry.totalAmount}</div>
                        </div>
                        <div class="drink-person-detail-items">
                            ${entry.drinks.map(drink => {
                                const info = DRINK_TYPES[drink.type] || DRINK_TYPES['其他'];
                                return `<span class="drink-person-detail-item">${info.icon} ${drink.type} ${drink.amount}${info.unit}</span>`;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 渲染统计概览
    // 统计详情弹窗函数
    window.showStatsDetail = function(type) {
        const popup = document.getElementById('statsDetailPopup');
        const titleEl = document.getElementById('statsDetailTitle');
        const bodyEl = document.getElementById('statsDetailBody');

        if (!popup || !titleEl || !bodyEl) return;

        const realNow = new Date();
        const isCurrentMonth = realNow.getFullYear() === curYear && realNow.getMonth() === curMonth;

        let title = '';
        let content = '';

        const userStats = USERS.map(u => {
            let stats;
            if (type === 'month') {
                stats = StatsUtils.getMonthStats(curYear, curMonth, u.id);
            } else if (type === 'week') {
                const today = realNow.getDate();
                stats = StatsUtils.getWeekStats(curYear, curMonth, today, u.id);
            } else if (type === 'today') {
                const today = realNow.getDate();
                const dayData = appData?.[curMonth]?.[today];
                const status = dayData?.u?.[u.id];
                stats = { total: status ? 1 : 0, details: { '微醺': 0, '刚刚好': 0, '醉了': 0 } };
                if (status) stats.details[status] = 1;
            } else if (type === 'active') {
                const monthStats = StatsUtils.getMonthStats(curYear, curMonth, u.id);
                stats = { total: monthStats.total, details: monthStats.details };
            }
            return { user: u, ...stats };
        });

        if (type === 'month') {
            title = `📊 ${curYear}年${curMonth + 1}月 统计详情`;
            const totalRecords = userStats.reduce((sum, u) => sum + u.total, 0);
            const statusCount = { '微醺': 0, '刚刚好': 0, '醉了': 0 };
            userStats.forEach(u => {
                statusCount['微醺'] += u.details['微醺'];
                statusCount['刚刚好'] += u.details['刚刚好'];
                statusCount['醉了'] += u.details['醉了'];
            });

            const { drinkStats } = getMonthDrinkStatsSummary();
            const totalDrinkCount = Object.values(drinkStats).reduce((sum, d) => sum + d.count, 0);

            content = `
                <div class="stats-detail-section">
                    <h4>📈 总体统计</h4>
                    <div class="stats-detail-grid">
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${totalRecords}</div>
                            <div class="stats-detail-label">总记录次数</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num" style="color:var(--c-tipsy);">${statusCount['微醺']}</div>
                            <div class="stats-detail-label">微醺</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num" style="color:var(--c-good);">${statusCount['刚刚好']}</div>
                            <div class="stats-detail-label">刚刚好</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num" style="color:var(--c-drunk);">${statusCount['醉了']}</div>
                            <div class="stats-detail-label">醉了</div>
                        </div>
                    </div>
                </div>
                ${totalDrinkCount > 0 ? `
                <div class="stats-detail-section">
                    <h4>🍺 酒类分布</h4>
                    <div class="drink-stats-list">
                        ${Object.entries(drinkStats).filter(([_, d]) => d.count > 0).sort((a, b) => b[1].count - a[1].count).map(([type, stat]) => {
                            const info = DRINK_TYPES[type] || DRINK_TYPES['其他'];
                            const percentage = Math.round(stat.count / totalDrinkCount * 100);
                            return `
                                <div class="drink-stat-row">
                                    <div class="drink-stat-icon">${info.icon}</div>
                                    <div class="drink-stat-info">
                                        <div class="drink-stat-name">${type}</div>
                                        <div class="drink-stat-bar">
                                            <div class="drink-stat-progress" style="width:${percentage}%;background:${info.color};"></div>
                                        </div>
                                    </div>
                                    <div class="drink-stat-num">
                                        <div class="drink-stat-count">${stat.count}</div>
                                        <div class="drink-stat-amount">${stat.amount}${info.unit}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                <div class="stats-detail-section">
                    <h4>👥 个人统计</h4>
                    <div class="stats-user-list">
                        ${userStats.map(u => `
                            <div class="stats-user-item" style="border-left:3px solid ${u.user.color};">
                                <div class="stats-user-name">${u.user.name}</div>
                                <div class="stats-user-detail">
                                    <span>${u.total}次</span>
                                    <span style="color:var(--c-tipsy);">${u.details['微醺']}微醺</span>
                                    <span style="color:var(--c-good);">${u.details['刚刚好']}刚好</span>
                                    <span style="color:var(--c-drunk);">${u.details['醉了']}醉了</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (type === 'drinks') {
            const { drinkStats, personStats } = getMonthDrinkStatsSummary();
            const totalDrinkCount = Object.values(drinkStats).reduce((sum, d) => sum + d.count, 0);
            const totalAmount = Object.values(drinkStats).reduce((sum, d) => sum + d.amount, 0);
            const activePersons = Object.values(personStats).filter(p => p.totalCount > 0);
            const contentId = 'drink-stats-content-' + Date.now();
            const filterId = `${contentId}-filter`;
            const detailId = `${contentId}-detail`;
            const initialUserId = activePersons[0]?.user.id || null;

            drinkStatsState[contentId] = {
                sortBy: 'count',
                selectedUserId: initialUserId,
                filterId,
                detailId
            };

            title = `🍺 ${curYear}年${curMonth + 1}月 酒类统计`;

            content = `
                <div class="stats-detail-section">
                    <h4>📊 酒类概览</h4>
                    <div class="stats-detail-grid">
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${totalDrinkCount}</div>
                            <div class="stats-detail-label">饮酒次数</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${totalAmount}</div>
                            <div class="stats-detail-label">饮酒总量</div>
                        </div>
                    </div>
                </div>
                ${totalDrinkCount > 0 ? `
                <div class="stats-detail-section">
                    <h4>🍶 各类酒品统计</h4>
                    <div class="drink-stats-list">
                        ${Object.entries(drinkStats).filter(([_, d]) => d.count > 0).sort((a, b) => b[1].count - a[1].count).map(([drinkType, stat]) => {
                            const info = DRINK_TYPES[drinkType] || DRINK_TYPES['其他'];
                            const percentage = Math.round(stat.count / totalDrinkCount * 100);
                            return `
                                <div class="drink-stat-row">
                                    <div class="drink-stat-icon">${info.icon}</div>
                                    <div class="drink-stat-info">
                                        <div class="drink-stat-name">${drinkType}</div>
                                        <div class="drink-stat-bar">
                                            <div class="drink-stat-progress" style="width:${percentage}%;background:${info.color};"></div>
                                        </div>
                                    </div>
                                    <div class="drink-stat-num">
                                        <div class="drink-stat-count">${stat.count}</div>
                                        <div class="drink-stat-amount">${stat.amount}${info.unit}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="stats-detail-section">
                    <h4>👥 人员酒类详情</h4>
                    <div class="drink-stats-filter">
                        <select class="drink-filter-select" id="${filterId}" onchange="updateDrinkPersonStats('${contentId}')">
                            <option value="all">全部人员</option>
                            ${activePersons.map(p => `<option value="${p.user.id}">${p.user.name}</option>`).join('')}
                        </select>
                        <div class="drink-filter-sort">
                            <button class="drink-sort-btn active" data-sort="count" onclick="setDrinkSort('${contentId}', 'count')">按次数</button>
                            <button class="drink-sort-btn" data-sort="amount" onclick="setDrinkSort('${contentId}', 'amount')">按数量</button>
                            <button class="drink-sort-btn" data-sort="name" onclick="setDrinkSort('${contentId}', 'name')">按姓名</button>
                        </div>
                    </div>
                    <div class="drink-person-list" id="${contentId}">
                        ${renderDrinkPersonStatsHTML(contentId, activePersons, initialUserId, 'count', 'all')}
                    </div>
                    <div class="drink-person-panel" id="${detailId}">
                        ${initialUserId ? `
                            <div class="drink-person-panel-head">
                                <div>
                                    <div class="drink-person-panel-title">${personStats[initialUserId].user.name} 的本月明细</div>
                                    <div class="drink-person-panel-subtitle">点击成员可查看具体日期与酒类</div>
                                </div>
                            </div>
                            ${renderDrinkPersonDetailHTML(personStats[initialUserId])}
                        ` : '<div class="drink-person-detail-empty">本月暂无酒类记录</div>'}
                    </div>
                </div>
                ` : '<p style="text-align:center;color:#999;padding:20px;">本月暂无酒类记录</p>'}
            `;
        } else if (type === 'week') {
            title = `📅 本周统计详情`;
            const totalRecords = userStats.reduce((sum, u) => sum + u.total, 0);

            content = `
                <div class="stats-detail-section">
                    <h4>📈 本周统计</h4>
                    <div class="stats-detail-grid">
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${isCurrentMonth ? totalRecords : '—'}</div>
                            <div class="stats-detail-label">本周记录</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${isCurrentMonth ? Math.round(totalRecords / 7) : '—'}</div>
                            <div class="stats-detail-label">日均</div>
                        </div>
                    </div>
                </div>
                ${isCurrentMonth ? `
                <div class="stats-detail-section">
                    <h4>👥 个人统计</h4>
                    <div class="stats-user-list">
                        ${userStats.map(u => `
                            <div class="stats-user-item" style="border-left:3px solid ${u.user.color};">
                                <div class="stats-user-name">${u.user.name}</div>
                                <div class="stats-user-detail">${u.total}次</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : '<p style="text-align:center;color:#999;padding:20px;">仅显示当月数据</p>'}
            `;
        } else if (type === 'today') {
            title = `✨ 今日记录详情`;
            const totalRecords = userStats.reduce((sum, u) => sum + u.total, 0);
            const completed = totalRecords > 0;

            content = `
                <div class="stats-detail-section">
                    <h4>📝 今日状态</h4>
                    <div class="stats-detail-grid">
                        <div class="stats-detail-item">
                            <div class="stats-detail-num" style="color:${completed ? 'var(--c-good)' : 'var(--text-sub)'};">${completed ? '已记录' : '待记录'}</div>
                            <div class="stats-detail-label">状态</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${totalRecords}/${USERS.length}</div>
                            <div class="stats-detail-label">已记录人数</div>
                        </div>
                    </div>
                </div>
                <div class="stats-detail-section">
                    <h4>👥 今日情况</h4>
                    <div class="stats-user-list">
                        ${userStats.map(u => `
                            <div class="stats-user-item" style="border-left:3px solid ${u.user.color};">
                                <div class="stats-user-name">${u.user.name}</div>
                                <div class="stats-user-detail">${u.total > 0 ? '✅ 已记录' : '⏳ 待记录'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (type === 'active') {
            title = `🔥 活跃度详情`;
            const totalRecords = userStats.reduce((sum, u) => sum + u.total, 0);
            const activeUsers = userStats.filter(u => u.total > 0).length;

            content = `
                <div class="stats-detail-section">
                    <h4>📊 活跃度统计</h4>
                    <div class="stats-detail-grid">
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${activeUsers}</div>
                            <div class="stats-detail-label">活跃人数</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${USERS.length}</div>
                            <div class="stats-detail-label">总人数</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${totalRecords > 0 ? Math.round(totalRecords / activeUsers) : 0}</div>
                            <div class="stats-detail-label">人均次数</div>
                        </div>
                        <div class="stats-detail-item">
                            <div class="stats-detail-num">${USERS.length > 0 ? Math.round(activeUsers / USERS.length * 100) : 0}%</div>
                            <div class="stats-detail-label">活跃率</div>
                        </div>
                    </div>
                </div>
                <div class="stats-detail-section">
                    <h4>👥 个人活跃度</h4>
                    <div class="stats-user-list">
                        ${userStats.map(u => `
                            <div class="stats-user-item" style="border-left:3px solid ${u.user.color};">
                                <div class="stats-user-name">${u.user.name}</div>
                                <div class="stats-user-detail">${u.total}天</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        titleEl.innerText = title;
        bodyEl.innerHTML = content;
        popup.classList.add('show');
        hapticFeedback('light');
    };

    window.closeStatsDetail = function() {
        const popup = document.getElementById('statsDetailPopup');
        if (popup) {
            popup.classList.remove('show');
            hapticFeedback('light');
        }
    };

    window.drinkStatsState = {};

    window.setDrinkSort = function(contentId, sortBy) {
        const container = document.getElementById(contentId);
        if (!container) return;

        const popup = container.closest('.stats-detail-content');
        if (popup) {
            popup.querySelectorAll('.drink-sort-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sort === sortBy);
            });
        }

        drinkStatsState[contentId] = drinkStatsState[contentId] || {};
        drinkStatsState[contentId].sortBy = sortBy;
        updateDrinkPersonStats(contentId);
        hapticFeedback('light');
    };

    window.updateDrinkPersonStats = function(contentId) {
        const container = document.getElementById(contentId);
        if (!container) return;

        const state = drinkStatsState[contentId] || {};
        const filterSelect = document.getElementById(state.filterId);
        const filterBy = filterSelect ? filterSelect.value : 'all';
        const sortBy = state.sortBy || 'count';

        const { personStats } = getMonthDrinkStatsSummary();
        const activePersons = Object.values(personStats).filter(p => p.totalCount > 0);

        let selectedUserId = state.selectedUserId;
        if (!selectedUserId || !activePersons.some(p => p.user.id === selectedUserId)) {
            selectedUserId = activePersons[0]?.user.id || null;
        }
        if (filterBy !== 'all' && selectedUserId !== filterBy) {
            selectedUserId = filterBy;
        }
        if (filterBy !== 'all' && !activePersons.some(p => p.user.id === selectedUserId)) {
            selectedUserId = activePersons[0]?.user.id || null;
        }

        state.selectedUserId = selectedUserId;
        drinkStatsState[contentId] = state;

        container.innerHTML = renderDrinkPersonStatsHTML(contentId, activePersons, selectedUserId, sortBy, filterBy);

        const detailEl = document.getElementById(state.detailId);
        if (detailEl) {
            const person = selectedUserId ? personStats[selectedUserId] : null;
            detailEl.innerHTML = person ? `
                <div class="drink-person-panel-head">
                    <div>
                        <div class="drink-person-panel-title">${person.user.name} 的本月明细</div>
                        <div class="drink-person-panel-subtitle">共 ${person.totalCount} 次记录，累计 ${person.totalAmount}</div>
                    </div>
                </div>
                ${renderDrinkPersonDetailHTML(person)}
            ` : '<div class="drink-person-detail-empty">暂无可展示的成员明细</div>';
        }
    };

    window.selectDrinkPersonDetail = function(contentId, userId) {
        const state = drinkStatsState[contentId] || {};
        state.selectedUserId = userId;
        drinkStatsState[contentId] = state;
        updateDrinkPersonStats(contentId);
        hapticFeedback('light');
    };
    
    // 渲染统计概览
    function renderStatsOverview() {
        const realNow = new Date();
        const isCurrentMonth = realNow.getFullYear() === curYear && realNow.getMonth() === curMonth;
        const today = realNow.getDate();

        // 计算本月总计
        let monthTotal = 0;
        const tDays = new Date(curYear, curMonth + 1, 0).getDate();
        for (let d = 1; d <= tDays; d++) monthTotal += StatsUtils.getDayRecordCount(curMonth, d);

        // 计算本周总计（基于当前日期）
        let weekTotal = 0;
        if (isCurrentMonth) {
            const range = DateUtils.getWeekRange(curYear, curMonth, today);
            const cur = new Date(range.startDate);
            while (cur <= range.endDate) {
                weekTotal += StatsUtils.getDayRecordCount(cur.getMonth(), cur.getDate());
                cur.setDate(cur.getDate() + 1);
            }
        }

        // 计算今日记录
        const todayCount = isCurrentMonth ? StatsUtils.getDayRecordCount(curMonth, today) : 0;

        // 计算活跃用户数（本月至少记录过一次）
        let activeUsers = 0;
        USERS.forEach((u) => {
            const stats = StatsUtils.getMonthStats(curYear, curMonth, u.id);
            if (stats.total > 0) activeUsers += 1;
        });

        const denom = USERS.length;
        const todayText = denom ? `${todayCount}/${denom}` : '—';
        const avgDays = denom ? Math.round(monthTotal / denom) : 0;
        const { drinkStats, personStats } = getMonthDrinkStatsSummary();
        const totalDrinkCount = Object.values(drinkStats).reduce((sum, d) => sum + d.count, 0);
        const totalDrinkAmount = Object.values(drinkStats).reduce((sum, d) => sum + d.amount, 0);
        const topDrink = Object.entries(drinkStats).sort((a, b) => b[1].amount - a[1].amount)[0];
        const topDrinkName = topDrink && topDrink[1].amount > 0 ? topDrink[0] : '';
        const topDrinkInfo = DRINK_TYPES[topDrinkName] || {};
        const drinkText = topDrinkName ? `${topDrinkInfo.icon} ${topDrinkName}` : '暂无明细';
        const hottestPerson = Object.values(personStats)
            .filter(p => p.totalCount > 0)
            .sort((a, b) => b.totalCount - a.totalCount)[0];
        const activeRate = denom ? Math.round(activeUsers / denom * 100) : 0;
        const weekHint = isCurrentMonth ? `${weekTotal} 次周内记录` : '切换到当月可看周节奏';
        const heroValue = `${monthTotal}`;

        const overview = document.getElementById('statsOverview');
        overview.innerHTML = `
            <div class="stats-overview-item stats-overview-hero" onclick="showStatsDetail('month')">
                <div class="stats-overview-kicker">Monthly Pulse</div>
                <div class="stats-overview-head">
                    <div class="stats-overview-meta">
                        <div class="stats-overview-label">${curYear}年${curMonth + 1}月态势</div>
                        <div class="stats-overview-caption">${weekHint}</div>
                    </div>
                    <div class="stats-overview-icon">📊</div>
                </div>
                <div class="stats-overview-main">
                    <div class="stats-overview-value">${heroValue}</div>
                    <div class="stats-overview-subvalue">${activeRate}% 活跃率</div>
                </div>
                <div class="stats-overview-footer">
                    <span class="stats-overview-chip">👥 ${activeUsers}/${denom || 0} 人活跃</span>
                    <span class="stats-overview-chip">🍺 ${totalDrinkCount} 次酒类记录</span>
                    <span class="stats-overview-chip">🏆 ${hottestPerson ? hottestPerson.user.name : '暂无'} 领先</span>
                </div>
                <div class="stats-overview-arrow">›</div>
            </div>
            <div class="stats-overview-item" data-tone="amber" onclick="showStatsDetail('drinks')">
                <div class="stats-overview-head">
                    <div class="stats-overview-meta">
                        <div class="stats-overview-label">酒类统计</div>
                        <div class="stats-overview-caption">${drinkText}</div>
                    </div>
                    <div class="stats-overview-icon">🍶</div>
                </div>
                <div class="stats-overview-main">
                    <div class="stats-overview-value">${totalDrinkCount}</div>
                    <div class="stats-overview-subvalue">${totalDrinkAmount} 总量</div>
                </div>
                <div class="stats-overview-footer">
                    <span class="stats-overview-chip">${topDrinkName ? `偏爱 ${topDrinkName}` : '等待记录'}</span>
                </div>
                <div class="stats-overview-arrow">›</div>
            </div>
            <div class="stats-overview-item" data-tone="green" onclick="showStatsDetail('today')">
                <div class="stats-overview-head">
                    <div class="stats-overview-meta">
                        <div class="stats-overview-label">今日记录</div>
                        <div class="stats-overview-caption">${isCurrentMonth ? '查看当天谁已记录' : '当前月份不是今天所在月'}</div>
                    </div>
                    <div class="stats-overview-icon">✨</div>
                </div>
                <div class="stats-overview-main">
                    <div class="stats-overview-value">${isCurrentMonth ? todayText : '—'}</div>
                    <div class="stats-overview-subvalue">${isCurrentMonth && denom && todayCount === denom ? '全员完成' : '继续补充'}</div>
                </div>
                <div class="stats-overview-footer">
                    <span class="stats-overview-chip">${isCurrentMonth ? `${todayCount} 人已填` : '切回当月查看'}</span>
                </div>
                <div class="stats-overview-arrow">›</div>
            </div>
            <div class="stats-overview-item" data-tone="rose" onclick="showStatsDetail('active')">
                <div class="stats-overview-head">
                    <div class="stats-overview-meta">
                        <div class="stats-overview-label">活跃度</div>
                        <div class="stats-overview-caption">${hottestPerson ? `${hottestPerson.user.name} 最活跃` : '本月暂无活跃成员'}</div>
                    </div>
                    <div class="stats-overview-icon">🔥</div>
                </div>
                <div class="stats-overview-main">
                    <div class="stats-overview-value">${avgDays}</div>
                    <div class="stats-overview-subvalue">平均每人</div>
                </div>
                <div class="stats-overview-footer">
                    <span class="stats-overview-chip">${activeUsers} 人有记录</span>
                </div>
                <div class="stats-overview-arrow">›</div>
            </div>
        `;
    }

    function render() {
        // 更新标题显示年份
        document.getElementById('monthTxt').innerText = `${curYear}年${curMonth+1}月`;
        const statsMonthTxt = document.getElementById('statsMonthTxt');
        if (statsMonthTxt) statsMonthTxt.innerText = `${curYear}年${curMonth+1}月`;
        document.getElementById('yearDisplay').innerText = curYear;
        document.getElementById('reportYearTitle').innerText = `${curYear}年度`;
        document.title = `${curYear} 喝酒记录日历`;

        // 渲染统计概览
        renderStatsOverview();

        // 获取当前用户列表（按位置排序）
        const usersList = getUsersInPositionOrder();
        const userCount = usersList.length;
        const gridClass = getGridClass(userCount);
        const sizeClass = getSizeClass(userCount);

        const memberFilterBar = document.getElementById('memberFilterBar');
        if (memberFilterBar) {
            const allActive = filterUserId === null;
            memberFilterBar.innerHTML = `
                <button class="member-filter-chip ${allActive ? 'active' : ''}" onclick="setFilter('')">
                    <span class="member-filter-avatar" style="background:linear-gradient(135deg,#34495e 0%,#5d6d7e 100%);">全</span>
                    <span class="member-filter-meta">
                        <span class="member-filter-name">全部成员</span>
                        <span class="member-filter-note">${userCount} 人视图</span>
                    </span>
                </button>
                ${usersList.map((u) => `
                    <button class="member-filter-chip ${filterUserId === u.id ? 'active' : ''}" onclick="setFilter('${u.id}')">
                        <span class="member-filter-avatar" style="background:${u.color};">${u.short}</span>
                        <span class="member-filter-meta">
                            <span class="member-filter-name">${u.name}</span>
                            <span class="member-filter-note">${filterUserId === u.id ? '当前筛选中' : `查看${u.short}的记录`}</span>
                        </span>
                    </button>
                `).join('')}
            `;
        }

        // 图例 - 动态根据用户数量显示
        const legend = document.getElementById('gridLegend');
        if (userCount > 0) {
            legend.innerHTML = usersList.map(u => {
                return `<div class="legend-item"><div class="legend-dot" style="background:${u.color}"></div>${u.short}</div>`;
            }).join('');
        } else {
            legend.innerHTML = `<div class="legend-item" style="opacity:0.55;">暂无成员，请先添加</div>`;
        }

        // 1. 日历
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        const fDay = new Date(curYear, curMonth, 1).getDay();
        const tDays = new Date(curYear, curMonth+1, 0).getDate();

        for(let i=0; i<fDay; i++) grid.appendChild(document.createElement('div'));

        for(let d=1; d<=tDays; d++) {
            const cell = document.createElement('div');
            cell.className = 'day-box';
            if(now.getFullYear()===curYear && now.getMonth()===curMonth && now.getDate()===d) cell.classList.add('today');

            // 动态网格生成
            let dotsHTML = '';
            const dayData = appData?.[curMonth]?.[d];
            const uMap = dayData?.u && typeof dayData.u === 'object' ? dayData.u : {};

            usersList.forEach((u) => {
                const s = uMap[u.id] || '';
                let inner = '';
                if (filterUserId !== null && filterUserId !== u.id) {
                    if (s) inner = `<div class="status-dot ${sizeClass}" style="background:#e0e0e0; border:1px solid #ccc; opacity:0.28;">${u.short}</div>`;
                } else {
                    if (s) inner = `<div class="status-dot ${STATUS_MAP[s].cls} ${sizeClass}" style="border:1px solid ${u.color}">${u.short}</div>`;
                }
                dotsHTML += `<div class="quad-cell">${inner}</div>`;
            });

            cell.innerHTML = `<span class="day-num">${d}</span><div class="quad-grid ${gridClass}">${dotsHTML}</div>`;
            cell.onclick = () => openSheet(d);
            grid.appendChild(cell);
        }

        // 2. 排行榜
        const statsSpotlight = document.getElementById('statsSpotlight');
        const list = document.getElementById('rankList');
        let stats = getUsersInPositionOrder().map((u) => {
            let t = 0;
            let d = { '微醺':0, '刚刚好':0, '醉了':0 };
            for(let day=1; day<=tDays; day++) {
                const s = appData?.[curMonth]?.[day]?.u?.[u.id];
                if(s) { t++; if(d[s]!==undefined) d[s]++; }
            }
            return { ...u, total:t, details:d };
        });
        
        stats.sort((a,b) => b.total - a.total);
        const max = stats[0]?.total || 1;
        const totalRecords = stats.reduce((sum, item) => sum + item.total, 0);
        const leader = stats[0];
        const activeStatsUsers = stats.filter(item => item.total > 0).length;
        const consistency = userCount ? Math.round(totalRecords / userCount) : 0;

        if (statsSpotlight) {
            statsSpotlight.innerHTML = `
                <div class="stats-spotlight-card" data-tone="gold">
                    <h4>本月记录总数</h4>
                    <div class="stats-spotlight-value">${totalRecords}</div>
                    <div class="stats-spotlight-note">${activeStatsUsers} 人有记录，当前榜单随月份联动</div>
                </div>
                <div class="stats-spotlight-card" data-tone="blue">
                    <h4>本月领跑成员</h4>
                    <div class="stats-spotlight-value">${leader ? leader.short : '—'}</div>
                    <div class="stats-spotlight-note">${leader ? `${leader.name} 已记录 ${leader.total} 天` : '暂无数据'}</div>
                </div>
                <div class="stats-spotlight-card" data-tone="mint">
                    <h4>人均活跃天数</h4>
                    <div class="stats-spotlight-value">${consistency}</div>
                    <div class="stats-spotlight-note">${filterUserId ? '当前已按成员筛选月历' : '点击榜单可联动筛选月历'}</div>
                </div>
            `;
        }

        list.innerHTML = stats.map((item, idx) => {
            const pct = (item.total/max)*100;
            const rCls = idx===0 ? 'top-1' : idx===1 ? 'top-2' : idx===2 ? 'top-3' : '';
            const isActive = filterUserId === item.id;
            const shouldExpand = filterUserId === null || isActive;
            return `
                <div class="rank-row ${shouldExpand ? 'expanded' : ''}" onclick='toggleRankAndFilter(${JSON.stringify(item.id)}, this)'>
                    <div class="rank-head">
                        <span class="rank-idx ${rCls}">${idx+1}</span>
                        <div class="rank-avatar" style="background:${item.color}">${item.short}</div>
                        <div class="rank-info">
                            <div class="rank-name-row">
                                <div>
                                    <div class="rank-name">${item.name} ${isActive ? '✓' : ''}</div>
                                    <div class="rank-meta">
                                        <span class="rank-pill">本月 ${item.total} 天</span>
                                        <span class="rank-pill">峰值 ${Math.max(item.details['微醺'], item.details['刚刚好'], item.details['醉了'])} 次</span>
                                    </div>
                                </div>
                                <div class="rank-total">
                                    <strong>${item.total}</strong>
                                    <span>记录天数</span>
                                </div>
                            </div>
                            <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${pct}%;background:${item.color}"></div></div>
                        </div>
                    </div>
                    <div class="rank-detail">
                        <div class="stat-flex">
                            <div class="stat-item"><h4 style="color:var(--c-tipsy)">${item.details['微醺']}</h4><p>微醺</p></div>
                            <div class="stat-item"><h4 style="color:var(--c-good)">${item.details['刚刚好']}</h4><p>刚好</p></div>
                            <div class="stat-item"><h4 style="color:var(--c-drunk)">${item.details['醉了']}</h4><p>醉了</p></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 筛选功能
    window.setFilter = function(userId) {
        filterUserId = userId || null;
        render();
        // 滚动到日历区域
        document.querySelector('.cal-body').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // 下拉列表筛选
    window.handleFilterChange = function(value) {
        filterUserId = value || null;
        render();
        // 滚动到日历区域
        document.querySelector('.cal-body').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // 点击排行榜切换展开和筛选
    window.toggleRankAndFilter = function(userId) {
        if (filterUserId === userId) filterUserId = null;
        else filterUserId = userId;
        render();
        // 滚动到日历
        setTimeout(() => {
            document.querySelector('.cal-body').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    // Sheet
    function openSheet(d) {
        editDay = d;

        // 基础日期信息
        const fullDate = `${curYear}年${curMonth + 1}月${d}日`;
        document.getElementById('sheetTitle').innerText = `📅 ${fullDate}`;

        // 星期几
        const weekday = DateUtils.getWeekDay(curYear, curMonth, d);
        const isWeekend = DateUtils.isWeekend(curYear, curMonth, d);
        const weekdayEl = document.getElementById('sheetWeekday');
        weekdayEl.innerText = weekday;
        weekdayEl.className = 'sheet-weekday' + (isWeekend ? ' weekend' : '');

        // 节日信息
        const { solarHoliday, lunarHoliday, lunarText } = DateUtils.getHolidayInfo(curYear, curMonth, d);
        const holidayEl = document.getElementById('sheetHoliday');
        const badges = [];
        if (solarHoliday) badges.push(`<div class="sheet-holiday">🎉 ${solarHoliday}</div>`);
        if (lunarHoliday) badges.push(`<div class="sheet-holiday lunar">🧧 ${lunarHoliday}</div>`);
        if (lunarText) badges.push(`<div class="sheet-lunar">🌙 农历${lunarText}</div>`);
        holidayEl.innerHTML = badges.length ? `<div class="sheet-holiday-wrap">${badges.join('')}</div>` : '';

        // 快速统计
        const recordCount = StatsUtils.getDayRecordCount(curMonth, d);
        const denom = USERS.length;
        const recordText = denom ? `${recordCount}/${denom}` : '—';
        const statsHTML = `
            <div class="sheet-stat-item">
                <div class="sheet-stat-value">${recordText}</div>
                <div class="sheet-stat-label">已记录</div>
            </div>
            <div class="sheet-stat-item">
                <div class="sheet-stat-value">${curMonth + 1}月</div>
                <div class="sheet-stat-label">当前月份</div>
            </div>
            <div class="sheet-stat-item">
                <div class="sheet-stat-value">${d}</div>
                <div class="sheet-stat-label">第${d}天</div>
            </div>
        `;
        document.getElementById('sheetStats').innerHTML = statsHTML;

        // 原有的记录选项
        const dayData = normalizeDayData(appData?.[curMonth]?.[d]);
        tempEdit = { ...(dayData.u || {}) };
        tempPhotos = Array.isArray(dayData.photos) ? [...dayData.photos] : [];
        tempExtra = {}; // 每个人的额外信息
        tempDrinks = {}; // 每个人的酒类记录

        // 加载公共备注
        const dayNote = dayData.note || '';
        document.getElementById('drinkNote').value = dayNote;

        // 检查是否需要显示健康提醒
        checkAndShowReminder(d);

        document.getElementById('sheetRows').innerHTML = getUsersInPositionOrder().map((u) => {
            const cur = dayData.u?.[u.id] || '';
            // 加载每个人的额外信息
            const userExtra = dayData.extra?.[u.id] || {};
            tempExtra[u.id] = { ...userExtra };
            // 加载酒类记录
            const userDrinks = dayData.drinks?.[u.id] || [];
            tempDrinks[u.id] = [...userDrinks];

            // 计算该用户的统计
            const weekStats = StatsUtils.getWeekStats(curYear, curMonth, d, u.id);
            const monthStats = StatsUtils.getMonthStats(curYear, curMonth, u.id);
            const consecutive = StatsUtils.getConsecutiveDays(curYear, curMonth, d, u.id);

            const btns = OPTS.map(o => {
                const label = o === '' ? '无' : o;
                const act = cur === o ? 'active' : '';
                return `<div class="opt-btn ${act}" data-v="${o}" data-user-id="${u.id}">${label}</div>`;
            }).join('');

            // 个人统计信息
            const userStatsHTML = cur && cur !== '' ? `
                <div style="display:flex;gap:8px;margin-top:8px;font-size:11px;color:#999;">
                    <span>📊 本周${weekStats.total}次</span>
                    <span>📅 本月${monthStats.total}次</span>
                    ${consecutive > 1 ? `<span>🔥 连续${consecutive}天</span>` : ''}
                </div>
            ` : '';

            // 酒类记录 HTML
            const drinksHTML = generateDrinksHTML(u.id, userDrinks);

            return `
                <div class="user-record-section" style="margin-bottom:20px;padding:16px;background:var(--bg-card);border-radius:12px;border:2px solid ${u.color}20;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <div style="width:32px;height:32px;border-radius:50%;background:${u.color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;">${u.short}</div>
                        <div style="font-weight:700;color:${u.color};font-size:15px;">${u.name}</div>
                    </div>
                    <div class="opt-grid" id="rg-${u.id}">${btns}</div>
                    ${userStatsHTML}
                    
                    <!-- 酒类记录区域 -->
                    <div class="drinks-section" style="margin-top:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <label style="font-size:12px;color:var(--text-sub);font-weight:600;">🍺 酒类记录</label>
                            <button class="add-drink-btn" onclick="addDrinkForUser('${u.id}')" style="padding:4px 10px;font-size:11px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;">+ 添加酒类</button>
                        </div>
                        <div class="drinks-list" id="drinks-${u.id}">
                            ${drinksHTML}
                        </div>
                    </div>

                    <!-- 费用记录 -->
                    <div style="margin-top:12px;">
                        <label style="font-size:11px;color:var(--text-sub);display:block;margin-bottom:4px;">💰 消费金额</label>
                        <div style="display:flex;align-items:center;gap:4px;">
                            <span style="font-size:14px;color:var(--text-sub);">¥</span>
                            <input type="number" class="user-cost-input" data-user-id="${u.id}" placeholder="0" min="0" step="1" value="${userExtra.cost || ''}" style="flex:1;padding:8px 10px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;background:var(--bg-card);color:var(--text-main);">
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        renderPhotoPreview();
        document.getElementById('sheet').classList.add('show');
        hapticFeedback('light');
    }

    // 生成酒类记录 HTML
    function generateDrinksHTML(userId, drinks) {
        if (!drinks || drinks.length === 0) {
            return `<div style="color:#999;font-size:12px;padding:8px 0;">暂无酒类记录，点击上方添加</div>`;
        }
        return drinks.map((drink, index) => {
            const drinkInfo = DRINK_TYPES[drink.type] || DRINK_TYPES['其他'];
            const unit = drinkInfo.unit;
            const typeOptions = DRINK_TYPE_NAMES.map(t => 
                `<option value="${t}" ${drink.type === t ? 'selected' : ''}>${DRINK_TYPES[t].icon} ${t}</option>`
            ).join('');
            
            return `
                <div class="drink-item" style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-body);border-radius:8px;margin-bottom:6px;">
                    <select class="drink-type-select" data-user-id="${userId}" data-index="${index}" onchange="updateDrinkType('${userId}', ${index}, this.value)" style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:var(--bg-card);color:var(--text-main);">
                        ${typeOptions}
                    </select>
                    <input type="number" class="drink-amount-input" data-user-id="${userId}" data-index="${index}" placeholder="量" min="0" step="0.5" value="${drink.amount || ''}" onchange="updateDrinkAmount('${userId}', ${index}, this.value)" style="width:60px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:var(--bg-card);color:var(--text-main);text-align:center;">
                    <span style="font-size:11px;color:var(--text-sub);min-width:20px;">${unit}</span>
                    <button onclick="removeDrink('${userId}', ${index})" style="width:24px;height:24px;border:none;background:#e74c3c;color:white;border-radius:50%;cursor:pointer;font-size:12px;">×</button>
                </div>
            `;
        }).join('');
    }

    function renderDrinksForUser(userId) {
        const container = document.getElementById(`drinks-${userId}`);
        if (container) {
            container.innerHTML = generateDrinksHTML(userId, tempDrinks[userId] || []);
        }
    }

    // 添加酒类
    window.addDrinkForUser = function(userId) {
        if (!tempDrinks[userId]) tempDrinks[userId] = [];
        tempDrinks[userId].push({ type: '啤酒', amount: 1 });
        renderDrinksForUser(userId);
        hapticFeedback('light');
    };

    // 更新酒类类型
    window.updateDrinkType = function(userId, index, type) {
        if (tempDrinks[userId] && tempDrinks[userId][index]) {
            tempDrinks[userId][index].type = type;
            // 更新单位显示
            renderDrinksForUser(userId);
        }
    };

    // 更新酒类数量
    window.updateDrinkAmount = function(userId, index, amount) {
        if (tempDrinks[userId] && tempDrinks[userId][index]) {
            tempDrinks[userId][index].amount = parseFloat(amount) || 0;
        }
    };

    // 删除酒类
    window.removeDrink = function(userId, index) {
        if (tempDrinks[userId]) {
            tempDrinks[userId].splice(index, 1);
            renderDrinksForUser(userId);
            hapticFeedback('light');
        }
    };

    // 检查并显示健康提醒
    function checkAndShowReminder(day) {
        const reminderSection = document.getElementById('reminderSection');
        const reminderText = document.getElementById('reminderText');
        let reminders = [];

        // 统计每个人的连续喝酒天数
        USERS.forEach(u => {
            const consecutive = StatsUtils.getConsecutiveDays(curYear, curMonth, day, u.id);
            if (consecutive >= 3) {
                reminders.push(`${u.name}已连续喝酒${consecutive}天`);
            }
        });

        // 统计本周喝酒次数
        const weekRecords = [];
        USERS.forEach(u => {
            const weekStats = StatsUtils.getWeekStats(curYear, curMonth, day, u.id);
            if (weekStats.total >= 5) {
                weekRecords.push(`${u.name}本周已喝${weekStats.total}次`);
            }
        });

        if (reminders.length > 0 || weekRecords.length > 0) {
            const messages = [];
            if (reminders.length > 0) {
                messages.push(`连续喝酒提醒：${reminders.join('、')}`);
            }
            if (weekRecords.length > 0) {
                messages.push(`本周频次提醒：${weekRecords.join('、')}`);
            }
            reminderText.innerHTML = messages.join('<br>');
            reminderSection.style.display = 'block';
        } else {
            reminderSection.style.display = 'none';
        }
    }
    
    // 渲染照片预览
    function renderPhotoPreview() {
        const preview = document.getElementById('photoPreview');
        let html = '';
        tempPhotos.forEach((photo, idx) => {
            html += `
                <div class="photo-item">
                    <img src="${photo}" alt="照片${idx+1}">
                    <div class="photo-remove" onclick="removePhoto(${idx})">×</div>
                </div>
            `;
        });
        html += `
            <div class="photo-add-btn" onclick="addPhoto()">+</div>
            <input type="file" id="photoInput" accept="image/*" style="display:none" onchange="handlePhotoUpload(event)">
        `;
        preview.innerHTML = html;
    }
    
    window.addPhoto = function() {
        document.getElementById('photoInput').click();
    }
    
    window.handlePhotoUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            tempPhotos.push(e.target.result);
            renderPhotoPreview();
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }
    
    window.removePhoto = function(idx) {
        tempPhotos.splice(idx, 1);
        renderPhotoPreview();
    }

    window.setOpt = function(userId, v) {
        if (!userId) return;
        const hadStatus = Boolean(tempEdit[userId]);
        const hadDrinks = Array.isArray(tempDrinks[userId]) && tempDrinks[userId].length > 0;
        if (!v) {
            delete tempEdit[userId];
            if (hadStatus && hadDrinks) {
                tempDrinks[userId] = [];
                renderDrinksForUser(userId);
                showToast('已清空该成员的酒类记录');
            }
        } else {
            tempEdit[userId] = v;
        }

        // 触觉反馈
        hapticFeedback('light');

        // 更新按钮状态
        const container = document.getElementById(`rg-${userId}`);
        if (container) {
            container.querySelectorAll('.opt-btn').forEach(btn => {
                if (btn.dataset.v === v) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    function closeSheet() { document.getElementById('sheet').classList.remove('show'); }

    function save() {
        ensureAppMeta();
        if(!appData[curMonth]) appData[curMonth]={};
        const cleaned = {};
        for (const [k, v] of Object.entries(tempEdit || {})) {
            if (typeof v === 'string' && v) cleaned[k] = v;
        }
        const day = { u: cleaned };
        if (tempPhotos.length > 0) day.photos = tempPhotos;

        // 保存公共备注
        const note = document.getElementById('drinkNote').value.trim();
        if (note) day.note = note;

        // 保存每个人的费用和酒类记录
        const extraData = {};
        const drinksData = {};
        USERS.forEach(u => {
            const costInput = document.querySelector(`.user-cost-input[data-user-id="${u.id}"]`);
            const cost = costInput ? (parseFloat(costInput.value) || 0) : 0;

            // 保存费用
            if (cost > 0) {
                extraData[u.id] = { cost };
            }

            // 保存酒类记录
            if (tempDrinks[u.id] && tempDrinks[u.id].length > 0) {
                const validDrinks = tempDrinks[u.id]
                    .filter(d => d && typeof d.type === 'string' && d.type && Number(d.amount) > 0)
                    .map(d => ({
                        type: d.type,
                        amount: Number(d.amount)
                    }));
                if (validDrinks.length > 0) {
                    drinksData[u.id] = validDrinks;
                }
            }
        });

        if (Object.keys(extraData).length > 0) {
            day.extra = extraData;
        }
        if (Object.keys(drinksData).length > 0) {
            day.drinks = drinksData;
        }

        const normalizedDay = normalizeDayData(day);
        const hasDrinks = normalizedDay.drinks && Object.keys(normalizedDay.drinks).length > 0;
        const hasExtra = normalizedDay.extra && Object.keys(normalizedDay.extra).length > 0;
        const hasNote = typeof normalizedDay.note === 'string' && normalizedDay.note.trim().length > 0;
        const isEmpty = Object.keys(normalizedDay.u).length === 0 &&
            (!normalizedDay.photos || normalizedDay.photos.length === 0) &&
            !hasDrinks &&
            !hasExtra &&
            !hasNote;

        if (isEmpty) {
            delete appData[curMonth][editDay];
        } else {
            appData[curMonth][editDay] = normalizedDay;
        }
        closeSheet();
        hapticFeedback('success');
        render();
        renderReport();
        push();
    }

    function prepareAppDataForSync() {
        ensureAppMeta();
        migrateAppDataToV2();

        for (let m = 0; m < 12; m++) {
            const monthData = appData?.[m];
            if (!monthData || typeof monthData !== 'object') continue;

            for (const [dayKey, rawDayData] of Object.entries(monthData)) {
                if (!rawDayData || typeof rawDayData !== 'object') continue;

                const normalizedDay = normalizeDayData(rawDayData);
                const hasDrinks = normalizedDay.drinks && Object.keys(normalizedDay.drinks).length > 0;
                const hasExtra = normalizedDay.extra && Object.keys(normalizedDay.extra).length > 0;
                const hasNote = typeof normalizedDay.note === 'string' && normalizedDay.note.trim().length > 0;
                const isEmpty = Object.keys(normalizedDay.u).length === 0 &&
                    (!normalizedDay.photos || normalizedDay.photos.length === 0) &&
                    !hasDrinks &&
                    !hasExtra &&
                    !hasNote;

                if (isEmpty) {
                    delete monthData[dayKey];
                } else {
                    monthData[dayKey] = normalizedDay;
                }
            }
        }
    }

    async function pull() {
        updSync('saving', '同步中');
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: {'X-Master-Key': API_KEY}});
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const j = await response.json();
            
            let cloudData = null;
            if (j.record) {
                cloudData = j.record;
            } else if (j !== null && typeof j === 'object') {
                const keys = Object.keys(j);
                if (keys.length > 0 && keys[0] !== 'record') {
                    cloudData = j;
                }
            }
            
            if (!cloudData || typeof cloudData !== 'object') {
                cloudData = {};
            }
            
            appData = cloudData;
            
            if (appData.status === 'start') {
                appData = {};
            }
            
            hasPulled = true;

            const usersChanged = reconcileUsersFromAppData({ preferCloud: false });
            const migrated = migrateAppDataToV2();
            ensureSelectionsValid();

            render();
            renderReport();

            if (usersChanged || migrated) {
                pendingUserPush = false;
                push();
            } else if (pendingUserPush) {
                pendingUserPush = false;
                push();
            }

            updSync('saved','已同步');
        } catch(e) { 
            console.error('Pull failed:', e);
            updSync('', '离线');
        }
    }

    async function push() {
        updSync('saving', '保存中');
        try {
            prepareAppDataForSync();
            const ts = localUsersUpdatedAt && localUsersUpdatedAt > 0 ? localUsersUpdatedAt : Date.now();
            if (!localUsersUpdatedAt || localUsersUpdatedAt === 0) {
                localUsersUpdatedAt = ts;
                writeUsersToLocal(ts);
            }
            syncUsersToAppMeta(ts);
            
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT', headers: {'Content-Type':'application/json','X-Master-Key':API_KEY},
                body: JSON.stringify(appData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            updSync('saved','已保存');
        } catch(e) { 
            console.error('Push failed:', e);
            updSync('', '保存失败');
            showToast('保存失败，请检查网络后重试');
        }
    }

    function updSync(c,t) { 
        const el=document.getElementById('syncStatus'); el.className=`sync-badge ${c}`; el.innerText=t; 
    }
    
    // 导出数据
    function exportData() {
        ensureAppMeta();
        syncUsersToAppMeta(localUsersUpdatedAt);
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drink-calendar-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 提示
        const badge = document.getElementById('syncStatus');
        const oldText = badge.innerText;
        const oldClass = badge.className;
        badge.className = 'sync-badge saved';
        badge.innerText = '已导出';
        setTimeout(() => {
            badge.className = oldClass;
            badge.innerText = oldText;
        }, 2000);
        showToast('已导出');
    }
    
    // 导入数据
    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                
                // 简单验证数据格式
                if (typeof imported === 'object') {
                    appData = imported;
                    hasPulled = true;
                    reconcileUsersFromAppData({ preferCloud: true });
                    migrateAppDataToV2();
                    ensureSelectionsValid();
                    render();
                    renderReport();
                    push(); // 同步到云端
                    
                    // 提示
                    const badge = document.getElementById('syncStatus');
                    badge.className = 'sync-badge saved';
                    badge.innerText = '导入成功';
                    setTimeout(() => {
                        badge.className = 'sync-badge saved';
                        badge.innerText = '已同步';
                    }, 2000);
                } else {
                    alert('数据格式错误，请选择正确的JSON文件');
                }
            } catch (err) {
                alert('文件解析失败，请确认文件格式正确');
            }
        };
        reader.readAsText(file);
        
        // 清空input，允许重复导入同一文件
        event.target.value = '';
    }
    
    // 年度报告生成
    function renderReport() {
        ensureSelectionsValid();
        if (!reportUserId) {
            document.getElementById('reportTabs').innerHTML = '';
            document.getElementById('reportContent').innerHTML = '<p style="text-align:center; color:#999; padding:20px;">暂无成员</p>';
            return;
        }

        // 渲染用户标签
        const tabs = document.getElementById('reportTabs');
        tabs.innerHTML = getUsersInPositionOrder().map((u) => {
            return `<div class="report-tab ${reportUserId === u.id ? 'active' : ''}" 
                         style="${reportUserId === u.id ? `border-color: ${u.color}; background: ${u.color}15; color: ${u.color};` : ''}"
                         onclick='switchReport(${JSON.stringify(u.id)})'>
                         <div class="report-tab-name">${u.name}</div>
                         <div class="report-tab-meta">${u.short} · ${u.pos || '成员'}</div>
                         </div>`;
        }).join('');
        
        // 统计当前用户的年度数据
        const user = USERS.find(x => x.id === reportUserId);
        if (!user) {
            reportUserId = USERS[0]?.id || null;
            return renderReport();
        }
        let totalDays = 0;
        let statusCount = { '微醺': 0, '刚刚好': 0, '醉了': 0 };
        let photos = [];
        let monthlyCount = new Array(12).fill(0);
        let totalAmount = 0;  // 该用户的总饮酒量
        let totalCost = 0;    // 该用户的总消费
        let maxDailyCost = { date: '', cost: 0 };
        
        // 酒类统计
        let drinkTypeStats = {};
        DRINK_TYPE_NAMES.forEach(type => {
            drinkTypeStats[type] = { count: 0, amount: 0 };
        });

        for(let m = 0; m < 12; m++) {
            if(!appData[m]) continue;
            for(let d = 1; d <= 31; d++) {
                const dayData = appData[m][d];
                if(!dayData) continue;

                const status = dayData?.u?.[user.id];
                if(status) {
                    totalDays++;
                    monthlyCount[m]++;
                    if(statusCount[status] !== undefined) {
                        statusCount[status]++;
                    }

                    if(dayData.photos && dayData.photos.length > 0) {
                        photos.push(...dayData.photos);
                    }

                    // 统计该用户的费用（每个人的独立数据）
                    const userExtra = dayData?.extra?.[user.id];
                    if (userExtra) {
                        if (userExtra.cost) {
                            totalCost += userExtra.cost;
                            if (userExtra.cost > maxDailyCost.cost) {
                                maxDailyCost = { date: `${m + 1}月${d}日`, cost: userExtra.cost };
                            }
                        }
                    }

                    // 统计酒类记录
                    const userDrinks = dayData?.drinks?.[user.id];
                    if (userDrinks && Array.isArray(userDrinks)) {
                        userDrinks.forEach(drink => {
                            if (drink.type && drink.amount) {
                                if (drinkTypeStats[drink.type]) {
                                    drinkTypeStats[drink.type].count++;
                                    drinkTypeStats[drink.type].amount += drink.amount;
                                }
                                totalAmount += drink.amount;
                            }
                        });
                    }
                }
            }
        }
        
        const maxMonth = monthlyCount.indexOf(Math.max(...monthlyCount)) + 1;
        const favStatus = Object.keys(statusCount).reduce((a, b) => statusCount[a] > statusCount[b] ? a : b, '微醺');
        const avgAmount = totalDays > 0 ? (totalAmount / totalDays).toFixed(1) : 0;
        const avgCost = totalDays > 0 ? Math.round(totalCost / totalDays) : 0;

        // 找出最喜欢的酒类（按次数或量）
        const favDrinkType = Object.entries(drinkTypeStats)
            .filter(([_, stat]) => stat.count > 0)
            .sort((a, b) => b[1].count - a[1].count)[0];

        // 生成酒类统计HTML
        const drinkTypeHTML = Object.entries(drinkTypeStats)
            .filter(([_, stat]) => stat.count > 0)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([type, stat]) => {
                const info = DRINK_TYPES[type] || DRINK_TYPES['其他'];
                return `
                    <div class="drink-type-item">
                        <span class="drink-type-icon">${info.icon}</span>
                        <div class="drink-type-info">
                            <h5>${type}</h5>
                            <p>${stat.count}次 · ${stat.amount}${info.unit}</p>
                        </div>
                    </div>
                `;
            }).join('');

        // 渲染报告内容
        const content = document.getElementById('reportContent');
        content.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0; color:${user.color};">${user.name} 的 ${curYear} 喝酒年度报告</h2>
                <p style="margin:5px 0; color:#999;">让数据说话，记录美好时光 🍻</p>
            </div>

            <div class="report-stats">
                <div class="report-stat-box">
                    <h3 style="color:${user.color};">${totalDays}</h3>
                    <p>总喝酒天数</p>
                </div>
                <div class="report-stat-box">
                    <h3 style="color:var(--c-${favStatus === '微醺' ? 'tipsy' : favStatus === '刚刚好' ? 'good' : 'drunk'});">${favStatus}</h3>
                    <p>最常见状态</p>
                </div>
                <div class="report-stat-box">
                    <h3 style="color:#3498db;">${maxMonth}月</h3>
                    <p>喝酒最多月份</p>
                </div>
                <div class="report-stat-box">
                    <h3 style="color:#e67e22;">${photos.length}</h3>
                    <p>珍贵照片数</p>
                </div>
            </div>

            <!-- 酒类统计 -->
            ${Object.values(drinkTypeStats).some(s => s.count > 0) ? `
                <div class="drink-type-stat">
                    <h4 style="margin:0 0 12px 0; font-size:14px;">🍶 酒类统计</h4>
                    <div class="drink-type-grid">
                        ${drinkTypeHTML}
                    </div>
                    ${favDrinkType ? `
                        <div style="margin-top:12px; padding:10px; background:var(--bg-body); border-radius:8px; text-align:center;">
                            <span style="font-size:13px; color:var(--text-sub);">最爱喝的是</span>
                            <span style="font-size:16px; font-weight:700; color:${DRINK_TYPES[favDrinkType[0]]?.color || '#333'};">
                                ${DRINK_TYPES[favDrinkType[0]]?.icon || '🥤'} ${favDrinkType[0]}
                            </span>
                            <span style="font-size:13px; color:var(--text-sub);">，共${favDrinkType[1].count}次</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- 饮酒量统计 -->
            ${totalAmount > 0 ? `
                <div style="background:var(--bg-card); padding:15px; border-radius:10px; margin-bottom:15px; border: 2px solid var(--c-tipsy);">
                    <h4 style="margin:0 0 10px 0; font-size:14px;">🍺 饮酒量统计</h4>
                    <div class="stat-flex">
                        <div class="stat-item">
                            <h4 style="color:var(--c-tipsy)">${totalAmount.toFixed(1)}</h4>
                            <p>总饮酒量</p>
                        </div>
                        <div class="stat-item">
                            <h4 style="color:var(--c-good)">${avgAmount}</h4>
                            <p>平均每次</p>
                        </div>
                        <div class="stat-item">
                            <h4 style="color:#3498db;">${Object.values(drinkTypeStats).filter(s => s.count > 0).length}种</h4>
                            <p>酒类种类</p>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- 费用统计 -->
            ${totalCost > 0 ? `
                <div style="background:var(--bg-card); padding:15px; border-radius:10px; margin-bottom:15px; border: 2px solid var(--c-good);">
                    <h4 style="margin:0 0 10px 0; font-size:14px;">💰 费用统计</h4>
                    <div class="stat-flex">
                        <div class="stat-item">
                            <h4 style="color:var(--c-good)">¥${totalCost}</h4>
                            <p>总消费</p>
                        </div>
                        <div class="stat-item">
                            <h4 style="color:#3498db;">¥${avgCost}</h4>
                            <p>平均每次</p>
                        </div>
                        <div class="stat-item">
                            <h4 style="color:var(--c-drunk)">¥${maxDailyCost.cost}</h4>
                            <p>最高单日 ${maxDailyCost.date}</p>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div style="background:var(--bg-card); padding:15px; border-radius:10px; margin-bottom:15px;">
                <h4 style="margin:0 0 10px 0; font-size:14px;">📈 状态分布</h4>
                <div class="stat-flex">
                    <div class="stat-item">
                        <h4 style="color:var(--c-tipsy)">${statusCount['微醺']}</h4>
                        <p>微醺次数</p>
                    </div>
                    <div class="stat-item">
                        <h4 style="color:var(--c-good)">${statusCount['刚刚好']}</h4>
                        <p>刚好次数</p>
                    </div>
                    <div class="stat-item">
                        <h4 style="color:var(--c-drunk)">${statusCount['醉了']}</h4>
                        <p>醉了次数</p>
                    </div>
                </div>
            </div>

            ${photos.length > 0 ? `
                <div class="report-photos">
                    <h4 style="margin:0 0 10px 0; font-size:14px;">📸 年度回忆相册</h4>
                    <div class="report-photos-grid">
                        ${photos.slice(0, 9).map(p => `
                            <div class="report-photo">
                                <img src="${p}" alt="回忆">
                            </div>
                        `).join('')}
                    </div>
                    ${photos.length > 9 ? `<p style="text-align:center; color:#999; font-size:12px; margin-top:10px;">还有 ${photos.length - 9} 张照片...</p>` : ''}
                </div>
            ` : '<p style="text-align:center; color:#999; padding:20px;">暂无照片记录</p>'}
        `;
    }
    
    window.switchReport = function(userId) {
        reportUserId = userId;
        renderReport();
    }

    // ==================== Tab 切换功能 ====================
    window.switchMainTab = function(tabName) {
        // 更新 tab 按钮状态
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // 更新 tab 内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`tab-${tabName}`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // 如果切换到报告 tab，重新渲染报告
        if (tabName === 'report') {
            renderReport();
        }

        hapticFeedback('light');
    };

    // ==================== 年份选择器功能 ====================
    let yearSelectorStartYear = 2020;
    const YEARS_PER_PAGE = 16;

    window.toggleYearSelector = function() {
        const popup = document.getElementById('yearSelectorPopup');
        const isShowing = popup.classList.contains('show');
        
        if (isShowing) {
            popup.classList.remove('show');
        } else {
            // 初始化年份范围
            const currentYear = new Date().getFullYear();
            yearSelectorStartYear = Math.floor(currentYear / YEARS_PER_PAGE) * YEARS_PER_PAGE;
            // 确保当前年份在选择范围内
            while (curYear < yearSelectorStartYear) yearSelectorStartYear -= YEARS_PER_PAGE;
            while (curYear >= yearSelectorStartYear + YEARS_PER_PAGE) yearSelectorStartYear += YEARS_PER_PAGE;
            
            renderYearGrid();
            popup.classList.add('show');
        }
    };

    window.navigateYearRange = function(direction) {
        yearSelectorStartYear += direction * YEARS_PER_PAGE;
        renderYearGrid();
    };

    function renderYearGrid() {
        const yearListGrid = document.getElementById('yearListGrid');
        const yearRangeDisplay = document.getElementById('yearRangeDisplay');
        
        yearRangeDisplay.innerText = `${yearSelectorStartYear}-${yearSelectorStartYear + YEARS_PER_PAGE - 1}`;
        
        let html = '';
        for (let i = 0; i < YEARS_PER_PAGE; i++) {
            const year = yearSelectorStartYear + i;
            const isActive = year === curYear ? 'active' : '';
            html += `<div class="year-item ${isActive}" onclick="selectYear(${year})">${year}</div>`;
        }
        yearListGrid.innerHTML = html;
    }

    window.selectYear = function(year) {
        curYear = year;
        // 关闭年份选择器
        document.getElementById('yearSelectorPopup').classList.remove('show');
        render();
        renderReport();
        hapticFeedback('light');
    };

    // 点击外部关闭年份选择器
    document.addEventListener('click', function(e) {
        const yearPopup = document.getElementById('yearSelectorPopup');
        const yearDisplay = document.getElementById('yearDisplay');
        
        if (yearPopup && yearDisplay && 
            !yearPopup.contains(e.target) && 
            !yearDisplay.contains(e.target)) {
            yearPopup.classList.remove('show');
        }
    });
