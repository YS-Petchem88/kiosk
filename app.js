// 기기 고유 ID 생성 함수
function generateDeviceId() {
    const userAgent = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    const deviceFingerprint = `${userAgent}-${screenInfo}-${timezone}-${language}`;
    
    // 간단한 해시 함수
    let hash = 0;
    for (let i = 0; i < deviceFingerprint.length; i++) {
        const char = deviceFingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// 현재 기기 ID 저장 및 확인
function getOrCreateDeviceId() {
    let storedId = localStorage.getItem('kioskDeviceId');
    const currentId = generateDeviceId();
    
    if (!storedId) {
        // 처음 접속 - 기기 ID 저장
        localStorage.setItem('kioskDeviceId', currentId);
        localStorage.setItem('kioskDeviceIdTime', new Date().toISOString());
        return currentId;
    }
    
    if (storedId !== currentId) {
        // 다른 기기에서 접속 - 새로운 기기로 인식
        console.log('다른 기기에서 접속했습니다. 새로운 기록을 시작합니다.');
        localStorage.setItem('kioskDeviceId', currentId);
        localStorage.setItem('kioskDeviceIdTime', new Date().toISOString());
        // 기존 기록 초기화
        localStorage.removeItem('practiceHistory');
        return currentId;
    }
    
    return currentId;
}

// 기기 ID 확인 후 초기화
getOrCreateDeviceId();

// 키오스크 앱 로직
const app = {
    // 상태
    state: {
        store: null,
        storeName: '',
        difficulty: null,
        currentMission: '',
        currentStep: 'menuSelection',
        selectedMenu: null,
        selectedTemperature: null,
        selectedSize: null,
        selectedSeat: null,
        selectedTime: null,
        quantity: 1,
        cart: [],
        totalPrice: 0,
        voiceEnabled: true,
        hintLevel: 0,
        timerInterval: null,
        timeRemaining: 0,
        startTime: null,
        elapsedTime: 0,
        practiceHistory: (() => {
            try {
                const stored = localStorage.getItem('practiceHistory');
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                return [];
            }
        })()
    },

    // 가게별 메뉴 데이터
    menus: {
        cafe: {
            name: '☕ 카페',
            menuTitle: '☕ 음료를 선택해주세요.',
            items: [
                { name: '아메리카노', price: 4500, icon: '☕' },
                { name: '카푸치노', price: 5500, icon: '🥛' },
                { name: '라떼', price: 5500, icon: '🍶' },
                { name: '에스프레소', price: 3500, icon: '☕' },
                { name: '마끼아또', price: 5000, icon: '☕' },
                { name: '플랫화이트', price: 6000, icon: '☕' },
                { name: '모카', price: 6000, icon: '🍫' },
                { name: '바닐라 라떼', price: 6000, icon: '🍮' },
                { name: '캐러멜 마끼아또', price: 6500, icon: '☕' },
                { name: '콜드브루', price: 5000, icon: '🧊' },
                { name: '초콜릿', price: 5500, icon: '🍫' },
                { name: '헤이즐넛 라떼', price: 6000, icon: '☕' }
            ],
            options: ['temperature', 'size']
        },
        hamburger: {
            name: '🍔 햄버거 가게',
            menuTitle: '🍔 버거를 선택해주세요.',
            items: [
                { name: '클래식 버거', price: 8500, icon: '🍔' },
                { name: '더블 버거', price: 10500, icon: '🍔' },
                { name: '치즈 버거', price: 9500, icon: '🧀' },
                { name: '베이컨 버거', price: 11000, icon: '🥓' },
                { name: '치킨버거', price: 9500, icon: '🍗' },
                { name: '머쉬룸버거', price: 9000, icon: '🍔' },
                { name: '스파이시버거', price: 10000, icon: '🌶️' },
                { name: '통새우버거', price: 12000, icon: '🍤' },
                { name: '와규버거', price: 14000, icon: '🍔' }
            ],
            options: ['quantity']
        },
        korean: {
            name: '🍜 한식가게',
            menuTitle: '🍜 음식을 선택해주세요.',
            items: [
                { name: '김밥', price: 5000, icon: '🍙' },
                { name: '떡볶이', price: 6000, icon: '🌶️' },
                { name: '갈비탕', price: 12000, icon: '🍲' },
                { name: '비빔밥', price: 8000, icon: '🍚' },
                { name: '만두', price: 6500, icon: '🥟' },
                { name: '순두부찌개', price: 9000, icon: '🍲' },
                { name: '소불고기', price: 13000, icon: '🥩' },
                { name: '사골국밥', price: 10000, icon: '🍲' },
                { name: '김치볶음밥', price: 7500, icon: '🍚' }
            ],
            options: ['seat', 'quantity']
        },
        pizza: {
            name: '🍕 피자 가게',
            menuTitle: '🍕 피자를 선택해주세요.',
            items: [
                { name: '마르게리타', price: 15000, icon: '🍕' },
                { name: '페퍼로니', price: 16000, icon: '🍕' },
                { name: '슈프림', price: 18000, icon: '🍕' },
                { name: '하와이안', price: 17000, icon: '🍕' },
                { name: 'BBQ 치킨', price: 17500, icon: '🍕' },
                { name: '데리야끼', price: 16500, icon: '🍕' },
                { name: '불고기', price: 17000, icon: '🍕' },
                { name: '매운맛 피자', price: 16000, icon: '🌶️' },
                { name: '생햄 & 루꼴라', price: 18500, icon: '🍕' }
            ],
            options: ['size', 'quantity']
        },
        movie: {
            name: '🎬 영화관',
            menuTitle: '🎬 표를 선택해주세요.',
            items: [
                { name: '일반(성인)', price: 14000, icon: '🎟️' },
                { name: '청소년', price: 11000, icon: '🎟️' },
                { name: '어린이', price: 9000, icon: '🎟️' },
                { name: '장애인', price: 7000, icon: '🎟️' }
            ],
            options: ['seat', 'quantity']
        },
        train: {
            name: '🚆 기차역',
            menuTitle: '🚆 구간을 선택해주세요.',
            items: [
                { name: '서울 → 부산', price: 59000, icon: '🚆' },
                { name: '서울 → 대구', price: 45000, icon: '🚆' },
                { name: '서울 → 대전', price: 31000, icon: '🚆' },
                { name: '서울 → 광주', price: 48000, icon: '🚆' }
            ],
            options: ['time', 'seat', 'quantity']
        }
    },

    // 난이도별 설정
    difficultySettings: {
        practice: {
            name: '연습',
            autoVoice: true,
            highlightButtons: true,
            showHints: true,
            timeLimit: false
        },
        challenge: {
            name: '도전',
            autoVoice: false,
            highlightButtons: false,
            showHints: true,
            timeLimit: false
        },
        real: {
            name: '실전',
            autoVoice: false,
            highlightButtons: false,
            showHints: false,
            timeLimit: true
        }
    },

    // 힌트 단계별 내용
    hints: {
        menuSelection: [
            '메뉴를 선택해주세요.',
            '원하는 메뉴의 버튼을 살펴보세요. 메뉴를 눌러보세요.',
            '가능한 모든 메뉴를 한 번 살펴본 후 선택해보세요.'
        ],
        optionSelection: [
            '옵션을 선택해주세요.',
            '옵션 버튼을 살펴보세요. 원하는 옵션의 버튼을 눌러보세요.',
            '하나의 옵션을 먼저 선택한 후 다음 옵션으로 진행하세요.'
        ],
        quantitySelection: [
            '수량을 선택해주세요.',
            '몇 개를 주문할 것인지 + 버튼으로 늘리고 − 버튼으로 줄일 수 있습니다.',
            '원하는 수량을 선택한 후 "장바구니에 담기" 버튼을 눌러주세요.'
        ],
        orderConfirm: [
            '주문을 확인해주세요.',
            '선택한 메뉴와 가격이 맞는지 확인하고 "결제하기"를 누르세요.',
            '더 추가하고 싶으면 "+ 메뉴 추가"를 선택할 수 있습니다.'
        ]
    },

    // 미션 데이터 (가게별)
    missions: {
        cafe: [
            '아이스 아메리카노 한 잔',
            '따뜻한 카푸치노 한 잔',
            '따뜻한 라떼 한 잔과 따뜻한 에스프레소 한 잔'
        ],
        hamburger: [
            '클래식 버거 1개',
            '더블 버거와 치즈 버거 각 1개',
            '베이컨 버거 1개',
            '치킨버거 1개',
            '머쉬룸버거와 스파이시버거 각 1개',
            '통새우버거 1개',
            '와규버거 1개',
            '클래식 버거와 치즈 버거 각 2개',
            '더블 버거와 베이컨 버거 각 1개'
        ],
        korean: [
            '김밥 1줄',
            '떡볶이 1개',
            '갈비탕 1그릇',
            '비빔밥 1그릇',
            '만두 1인분과 순두부찌개 1그릇',
            '소불고기 1인분',
            '사골국밥 1그릇',
            '김치볶음밥 1그릇',
            '비빔밥과 떡볶이 세트'
        ],
        pizza: [
            '마르게리타 피자 1판',
            '페퍼로니와 슈프림 각 1판',
            '하와이안 피자 1판',
            'BBQ 치킨 피자 1판',
            '데리야끼 피자 1판',
            '불고기 피자 1판',
            '매운맛 피자 1판',
            '생햄 & 루꼴라 피자 1판',
            '마르게리타와 페퍼로니 각 1판'
        ],
        movie: [
            '청소년 1명 A1좌석과 어린이 1명 B5좌석',
            '성인 1명 D3좌석과 성인 1명 E4좌석과 어린이 1명 F2좌석',
            '청소년 1명 C6좌석과 청소년 1명 D1좌석',
            '어린이 2명 B2좌석과 B3좌석',
            '성인 1명 F1좌석과 성인 1명 F6좌석',
            '청소년 1명 A5좌석과 어린이 1명 C4좌석',
            '성인 1명 E2좌석과 어린이 2명 A3좌석과 A4좌석',
            '청소년 1명 B6좌석과 성인 1명 D5좌석',
            '어린이 1명 F3좌석'
        ],
        train: [
            '서울에서 부산행 2A좌석 1개와 서울에서 부산행 5B좌석 1개',
            '서울에서 대구행 3C좌석 1개와 서울에서 대구행 7A좌석 1개',
            '서울에서 대전행 4D좌석 1개',
            '서울에서 광주행 1A좌석 1개와 서울에서 광주행 9C좌석 1개',
            '서울에서 부산행 6B좌석 1개와 서울에서 부산행 10D좌석 1개',
            '서울에서 대구행 8A좌석 1개',
            '서울에서 대전행 2D좌석 1개와 서울에서 대전행 11B좌석 1개',
            '서울에서 광주행 5A좌석 1개와 서울에서 광주행 5C좌석 1개',
            '서울에서 부산행 3B좌석 1개'
        ]
    },

    // 초기화
    init() {
        this.showScreen('homeScreen');
    },

    // 화면 전환
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    },

    // 홈으로 이동
    goToHome() {
        this.resetState();
        this.showScreen('homeScreen');
    },

    // 상태 초기화
    resetState() {
        this.stopTimer();
        const kioskScreen = document.getElementById('kioskScreen');
        if (kioskScreen) kioskScreen.style.backgroundColor = 'white';
        const timerContainer = document.getElementById('timerContainer');
        if (timerContainer) timerContainer.style.display = 'none';
        
        const practiceHistory = this.state.practiceHistory || [];
        this.state = {
            store: null,
            storeName: '',
            difficulty: null,
            currentMission: '',
            currentStep: 'menuSelection',
            selectedMenu: null,
            selectedTemperature: null,
            selectedSize: null,
            selectedSeat: null,
            selectedTime: null,
            quantity: 1,
            cart: [],
            totalPrice: 0,
            voiceEnabled: true,
            hintLevel: 0,
            timerInterval: null,
            timeRemaining: 0,
            startTime: null,
            elapsedTime: 0,
            practiceHistory: practiceHistory
        };
    },

    // 가게 선택 화면으로
    goToStoreSelection() {
        this.showScreen('storeSelectionScreen');
    },

    // 가게 선택
    selectStore(store) {
        this.state.store = store;
        this.state.storeName = this.menus[store].name;
        this.goToDifficultySelection();
    },

    // 난이도 선택 화면으로
    goToDifficultySelection() {
        this.showScreen('difficultySelectionScreen');
    },

    // 난이도 선택
    selectDifficulty(difficulty) {
        this.state.difficulty = difficulty;
        this.showMission();
    },

    // 미션 표시
    showMission() {
        const missions = this.missions[this.state.store];
        const randomMission = missions[Math.floor(Math.random() * missions.length)];
        
        // 선택된 미션을 state에 저장
        this.state.currentMission = randomMission;
        document.getElementById('missionContent').textContent = randomMission;
        
        // 가게 이름 업데이트 (이모지 없이 이름만)
        const storeName = this.menus[this.state.store].name;
        document.getElementById('missionStore').innerHTML = 
            `<strong>${storeName}</strong>에서`;
        
        this.showScreen('missionScreen');
    },

    // 키오스크 시작
    startKiosk() {
        this.state.currentStep = 'menuSelection';
        this.state.hintLevel = 0;
        this.showScreen('kioskScreen');
        this.renderMenus();
        this.updateKioskStep();
        
        // 저장된 미션을 미션 배너에 표시
        const currentMissionElement = document.getElementById('currentMission');
        if (currentMissionElement) {
            currentMissionElement.textContent = this.state.currentMission;
        }
        
        const menuTitle = this.menus[this.state.store].menuTitle;
        this.speakMessage(menuTitle);
        
        // 실전 모드에서만 타이머 시작
        const timerContainer = document.getElementById('timerContainer');
        if (this.state.difficulty === 'real') {
            this.startTimer(120);
        } else {
            // 다른 모드에서는 타이머 숨기기
            if (timerContainer) timerContainer.style.display = 'none';
        }
    },

    // 동적 메뉴 렌더링
    renderMenus() {
        const menuGrid = document.querySelector('.menu-grid');
        const menuItems = this.menus[this.state.store].items;
        const menuTitle = this.menus[this.state.store].menuTitle;
        const storeName = this.menus[this.state.store].name;
        
        // 헤더에 가게 이름 업데이트
        const headerStoreName = document.getElementById('headerStoreName');
        if (headerStoreName) {
            headerStoreName.textContent = storeName;
        }
        
        document.querySelector('#menuSelectionStep h3').textContent = menuTitle;
        
        menuGrid.innerHTML = '';
        menuItems.forEach(menu => {
            const btn = document.createElement('button');
            btn.className = 'menu-item';
            btn.innerHTML = `
                <div class="menu-icon">${menu.icon}</div>
                <div class="menu-name">${menu.name}</div>
                <div class="menu-price">${menu.price.toLocaleString()}원</div>
            `;
            btn.onclick = () => app.selectMenu(menu.name);
            menuGrid.appendChild(btn);
        });
    },

    // 키오스크 단계 업데이트
    updateKioskStep() {
        document.querySelectorAll('.kiosk-step').forEach(step => {
            step.classList.remove('active');
        });

        const stepMap = {
            menuSelection: 'menuSelectionStep',
            optionSelection: 'optionSelectionStep',
            quantitySelection: 'quantitySelectionStep',
            orderConfirm: 'orderConfirmStep',
            payment: 'paymentStep'
        };

        const stepId = stepMap[this.state.currentStep];
        if (stepId) {
            document.getElementById(stepId).classList.add('active');
        }

        this.updateOrderSummary();
    },

    // 메뉴 선택
    selectMenu(menuName) {
        const storeMenus = this.menus[this.state.store].items;
        const menu = storeMenus.find(m => m.name === menuName);
        if (menu) {
            this.state.selectedMenu = menu;
            this.state.selectedTemperature = null;
            this.state.selectedSize = null;
            this.state.selectedSeat = null;
            this.state.selectedTime = null;
            this.state.quantity = 1;

            // 메뉴 버튼 하이라이트
            document.querySelectorAll('.menu-item').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.textContent.includes(menuName)) {
                    btn.classList.add('selected');
                }
            });

            const options = this.menus[this.state.store].options;
            
            if (options.length === 0) {
                this.state.currentStep = 'quantitySelection';
            } else if (options[0] === 'temperature') {
                this.state.currentStep = 'optionSelection';
                document.getElementById('optionTitle').textContent = '온도를 선택해주세요.';
                document.querySelector('.option-group').innerHTML = '';
                this.renderTemperatureOptions();
                document.getElementById('sizeOptionGroup').style.display = 'none';
            } else if (options[0] === 'size') {
                this.state.currentStep = 'optionSelection';
                document.getElementById('sizeOptionGroup').style.display = 'block';
                document.querySelector('.option-group').style.display = 'none';
            } else if (options[0] === 'seat') {
                this.state.currentStep = 'optionSelection';
                this.renderSeatOptions();
            } else if (options[0] === 'time') {
                this.state.currentStep = 'optionSelection';
                this.renderTimeOptions();
            } else {
                this.state.currentStep = 'quantitySelection';
            }

            this.updateKioskStep();
            const msgMap = {
                temperature: '온도를 선택해주세요.',
                size: '사이즈를 선택해주세요.',
                seat: '좌석을 선택해주세요.',
                time: '출발 시간을 선택해주세요.',
                quantity: '수량을 선택해주세요.'
            };
            const message = msgMap[options[0]] || '옵션을 선택해주세요.';
            this.speakMessage(message);
        }
    },

    // 온도 옵션 렌더링
    renderTemperatureOptions() {
        const optionGroup = document.querySelector('.option-group');
        optionGroup.style.display = 'grid';
        optionGroup.innerHTML = '';
        
        const temperatures = [{ name: 'HOT', label: '🔥 따뜻한' }, { name: 'ICE', label: '🧊 시원한' }];
        temperatures.forEach(temp => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = `${temp.label}`;
            btn.onclick = () => app.selectOption('temperature', temp.name);
            optionGroup.appendChild(btn);
        });
    },

    // 사이즈 옵션 렌더링
    renderSizeOptions() {
        const sizeOptionGroup = document.getElementById('sizeOptionGroup');
        sizeOptionGroup.style.display = 'block';
        sizeOptionGroup.innerHTML = '<p class="option-subtitle">사이즈를 선택해주세요.</p>';
        
        const sizes = [{ name: 'Regular', label: 'Regular' }, { name: 'Large', label: 'Large (+1,000원)' }];
        sizes.forEach(size => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = size.label;
            btn.onclick = () => app.selectOption('size', size.name);
            sizeOptionGroup.appendChild(btn);
        });
    },

    // 좌석 옵션 렌더링
    renderSeatOptions() {
        const optionTitle = document.getElementById('optionTitle');
        optionTitle.textContent = '좌석을 선택해주세요.';
        
        const optionGroup = document.querySelector('.option-group');
        optionGroup.innerHTML = '';
        
        if (this.state.store === 'movie') {
            // 영화관: A1~F6 (6줄 x 6석)
            const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
            optionGroup.style.display = 'grid';
            optionGroup.style.gridTemplateColumns = 'repeat(6, 1fr)';
            optionGroup.style.gap = '5px';
            optionGroup.style.maxHeight = '400px';
            optionGroup.style.overflowY = 'auto';
            
            for (let row of rows) {
                for (let num = 1; num <= 6; num++) {
                    const seat = `${row}${num}`;
                    const btn = document.createElement('button');
                    btn.className = 'option-btn';
                    btn.textContent = seat;
                    btn.style.padding = '8px';
                    btn.style.fontSize = '12px';
                    btn.onclick = () => app.selectOption('seat', seat);
                    optionGroup.appendChild(btn);
                }
            }
        } else if (this.state.store === 'train') {
            // 기차: 2:2 배치 (A-B | C-D) 11줄
            optionGroup.style.display = 'grid';
            optionGroup.style.gridTemplateColumns = 'repeat(5, 1fr)'; // A B [gap] C D
            optionGroup.style.gap = '10px';
            optionGroup.style.maxHeight = '400px';
            optionGroup.style.overflowY = 'auto';
            optionGroup.style.padding = '10px';
            
            // 11줄부터 1줄까지 역순으로 (위에서 아래)
            for (let num = 11; num >= 1; num--) {
                // A열
                const btnA = document.createElement('button');
                btnA.className = 'option-btn';
                btnA.textContent = `${num}A`;
                btnA.style.padding = '10px';
                btnA.style.fontSize = '12px';
                btnA.onclick = () => app.selectOption('seat', `${num}A`);
                optionGroup.appendChild(btnA);
                
                // B열
                const btnB = document.createElement('button');
                btnB.className = 'option-btn';
                btnB.textContent = `${num}B`;
                btnB.style.padding = '10px';
                btnB.style.fontSize = '12px';
                btnB.onclick = () => app.selectOption('seat', `${num}B`);
                optionGroup.appendChild(btnB);
                
                // 통로 (빈 공간)
                const gap = document.createElement('div');
                gap.style.display = 'flex';
                gap.style.alignItems = 'center';
                gap.style.justifyContent = 'center';
                gap.textContent = '🚶';
                gap.style.fontSize = '16px';
                optionGroup.appendChild(gap);
                
                // C열
                const btnC = document.createElement('button');
                btnC.className = 'option-btn';
                btnC.textContent = `${num}C`;
                btnC.style.padding = '10px';
                btnC.style.fontSize = '12px';
                btnC.onclick = () => app.selectOption('seat', `${num}C`);
                optionGroup.appendChild(btnC);
                
                // D열
                const btnD = document.createElement('button');
                btnD.className = 'option-btn';
                btnD.textContent = `${num}D`;
                btnD.style.padding = '10px';
                btnD.style.fontSize = '12px';
                btnD.onclick = () => app.selectOption('seat', `${num}D`);
                optionGroup.appendChild(btnD);
            }
        } else {
            // 다른 가게들: 일반석, VIP석 등
            const seats = ['일반석', '휠체어석', 'VIP석'];
            optionGroup.style.display = 'grid';
            optionGroup.style.gridTemplateColumns = 'repeat(3, 1fr)';
            optionGroup.style.gap = '5px';
            optionGroup.style.maxHeight = '400px';
            optionGroup.style.overflowY = 'auto';
            
            seats.forEach(seat => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = seat;
                btn.style.padding = '8px';
                btn.style.fontSize = '12px';
                btn.onclick = () => app.selectOption('seat', seat);
                optionGroup.appendChild(btn);
            });
        }
        
        document.getElementById('sizeOptionGroup').style.display = 'none';
    },

    // 시간 옵션 렌더링
    renderTimeOptions() {
        const optionTitle = document.getElementById('optionTitle');
        optionTitle.textContent = '출발 시간을 선택해주세요.';
        
        const optionGroup = document.querySelector('.option-group');
        optionGroup.innerHTML = '';
        
        const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
        times.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = `🕐 ${time}`;
            btn.onclick = () => app.selectOption('time', time);
            optionGroup.appendChild(btn);
        });
        
        optionGroup.style.display = 'grid';
        document.getElementById('sizeOptionGroup').style.display = 'none';
    },

    // 옵션 선택
    selectOption(type, value) {
        // 선택한 타입에 해당하는 상태 업데이트
        if (type === 'temperature') {
            this.state.selectedTemperature = value;
        } else if (type === 'size') {
            this.state.selectedSize = value;
        } else if (type === 'seat') {
            this.state.selectedSeat = value;
        } else if (type === 'time') {
            this.state.selectedTime = value;
        }
        
        this.updateOptionButtons();
        
        // 다음 옵션 찾기
        const options = this.menus[this.state.store].options;
        const currentIndex = options.indexOf(type);
        const nextOptionIndex = currentIndex + 1;
        
        if (nextOptionIndex < options.length) {
            const nextOption = options[nextOptionIndex];
            
            if (nextOption === 'temperature') {
                this.state.currentStep = 'optionSelection';
                this.renderTemperatureOptions();
                this.speakMessage('온도를 선택해주세요.');
            } else if (nextOption === 'size') {
                this.state.currentStep = 'optionSelection';
                this.renderSizeOptions();
                this.speakMessage('사이즈를 선택해주세요.');
            } else if (nextOption === 'seat') {
                this.state.currentStep = 'optionSelection';
                this.renderSeatOptions();
                this.speakMessage('좌석을 선택해주세요.');
            } else if (nextOption === 'time') {
                this.state.currentStep = 'optionSelection';
                this.renderTimeOptions();
                this.speakMessage('출발 시간을 선택해주세요.');
            } else if (nextOption === 'quantity') {
                this.state.currentStep = 'quantitySelection';
                this.updateKioskStep();
                this.speakMessage('수량을 선택해주세요.');
            }
        } else {
            // 모든 옵션이 선택됨
            if (options.includes('quantity')) {
                this.state.currentStep = 'quantitySelection';
                this.updateKioskStep();
                this.speakMessage('수량을 선택해주세요.');
            } else {
                this.addToCart();
            }
        }
    },

    // 옵션 버튼 업데이트
    updateOptionButtons() {
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelectorAll('.option-btn').forEach(btn => {
            const text = btn.textContent.trim();
            if ((this.state.selectedTemperature && text.includes(this.state.selectedTemperature)) ||
                (this.state.selectedSize && text.includes(this.state.selectedSize)) ||
                (this.state.selectedSeat && text.includes(this.state.selectedSeat)) ||
                (this.state.selectedTime && text.includes(this.state.selectedTime))) {
                btn.classList.add('selected');
            }
        });
    },

    // 수량 증가
    increaseQuantity() {
        this.state.quantity++;
        document.getElementById('quantityDisplay').textContent = this.state.quantity;
    },

    // 수량 감소
    decreaseQuantity() {
        if (this.state.quantity > 1) {
            this.state.quantity--;
            document.getElementById('quantityDisplay').textContent = this.state.quantity;
        }
    },

    // 장바구니에 추가
    addToCart() {
        if (this.state.selectedMenu) {
            const item = {
                menu: this.state.selectedMenu.name,
                temperature: this.state.selectedTemperature || '',
                size: this.state.selectedSize || '',
                seat: this.state.selectedSeat || '',
                time: this.state.selectedTime || '',
                quantity: this.state.quantity,
                price: this.state.selectedMenu.price
            };

            for (let i = 0; i < this.state.quantity; i++) {
                this.state.cart.push(JSON.parse(JSON.stringify(item)));
                item.quantity = 1;
            }

            this.state.currentStep = 'orderConfirm';
            this.updateKioskStep();
            this.updateOrderConfirm();
            this.speakMessage('주문을 확인해주세요.');
        }
    },

    // 주문 요약 업데이트
    updateOrderSummary() {
        const orderList = document.getElementById('orderList');
        if (this.state.cart.length === 0) {
            orderList.innerHTML = '<p class="empty-order">주문하실 메뉴를 선택해주세요.</p>';
        } else {
            let html = '';
            const cartGrouped = {};
            
            this.state.cart.forEach((item, index) => {
                const key = `${item.menu}-${item.temperature}-${item.size}-${item.seat}-${item.time}`;
                if (!cartGrouped[key]) {
                    cartGrouped[key] = { item, indices: [], count: 0 };
                }
                cartGrouped[key].indices.push(index);
                cartGrouped[key].count++;
            });

            let groupIndex = 0;
            for (const [key, data] of Object.entries(cartGrouped)) {
                const { item, indices, count } = data;
                const parts = key.split('-').filter(p => p);
                const itemKey = `cart-item-${groupIndex}`;
                
                html += `<div class="order-item" id="${itemKey}" data-group-index="${groupIndex}">
                    <div class="order-item-content">${parts.join(' / ')}</div>
                    <div class="order-item-controls">
                        <button class="order-item-btn decrease-btn" onclick="app.decreaseCartItemQuantity(${groupIndex})" title="수량 감소">−</button>
                        <span class="order-item-quantity">${count}</span>
                        <button class="order-item-btn increase-btn" onclick="app.increaseCartItemQuantity(${groupIndex})" title="수량 증가">+</button>
                        <button class="order-item-btn delete-btn" onclick="app.removeFromCart(${groupIndex})" title="메뉴 삭제">✕</button>
                    </div>
                </div>`;
                groupIndex++;
            }

            this.state.totalPrice = this.state.cart.reduce((sum, item) => {
                let price = item.price;
                if (item.size === 'Large') price += 1000;
                return sum + price;
            }, 0);

            orderList.innerHTML = html;
        }
    },

    // 장바구니 아이템 수량 감소
    decreaseCartItemQuantity(groupIndex) {
        const cartGrouped = {};
        this.state.cart.forEach((item, index) => {
            const key = `${item.menu}-${item.temperature}-${item.size}-${item.seat}-${item.time}`;
            if (!cartGrouped[key]) {
                cartGrouped[key] = [];
            }
            cartGrouped[key].push(index);
        });

        const keys = Object.keys(cartGrouped);
        const indices = cartGrouped[keys[groupIndex]];
        
        if (indices && indices.length > 0) {
            this.state.cart.splice(indices[indices.length - 1], 1);
            this.updateOrderSummary();
            this.updateOrderConfirm();
        }
    },

    // 장바구니 아이템 수량 증가
    increaseCartItemQuantity(groupIndex) {
        const cartGrouped = {};
        this.state.cart.forEach((item, index) => {
            const key = `${item.menu}-${item.temperature}-${item.size}-${item.seat}-${item.time}`;
            if (!cartGrouped[key]) {
                cartGrouped[key] = { item, indices: [] };
            }
            cartGrouped[key].indices.push(index);
        });

        const keys = Object.keys(cartGrouped);
        const { item } = cartGrouped[keys[groupIndex]];
        
        this.state.cart.push(JSON.parse(JSON.stringify(item)));
        this.updateOrderSummary();
        this.updateOrderConfirm();
    },

    // 장바구니에서 메뉴 삭제
    removeFromCart(groupIndex) {
        const cartGrouped = {};
        this.state.cart.forEach((item, index) => {
            const key = `${item.menu}-${item.temperature}-${item.size}-${item.seat}-${item.time}`;
            if (!cartGrouped[key]) {
                cartGrouped[key] = [];
            }
            cartGrouped[key].push(index);
        });

        const keys = Object.keys(cartGrouped);
        const indices = cartGrouped[keys[groupIndex]];
        
        if (indices) {
            // 인덱스가 큰 순서대로 삭제 (인덱스 변경 방지)
            indices.sort((a, b) => b - a).forEach(index => {
                this.state.cart.splice(index, 1);
            });
            this.updateOrderSummary();
            this.updateOrderConfirm();
        }
    },

    // 주문 확인 업데이트
    updateOrderConfirm() {
        const confirmList = document.getElementById('orderConfirmList');
        let html = '';
        let total = 0;

        const cartGrouped = {};
        this.state.cart.forEach(item => {
            const key = `${item.menu}-${item.temperature}-${item.size}-${item.seat}-${item.time}`;
            if (!cartGrouped[key]) {
                cartGrouped[key] = { ...item, quantity: 0 };
            }
            cartGrouped[key].quantity++;
        });

        for (const [key, item] of Object.entries(cartGrouped)) {
            let itemPrice = item.price;
            if (item.size === 'Large') itemPrice += 1000;
            const itemTotal = itemPrice * item.quantity;
            total += itemTotal;

            const details = [item.menu, item.temperature, item.size, item.seat, item.time].filter(d => d);

            html += `<div class="order-item-detail">
                ${details.join(' / ')}
                <br>
                ${itemPrice.toLocaleString()}원 × ${item.quantity} = ${itemTotal.toLocaleString()}원
            </div>`;
        }

        confirmList.innerHTML = html;
        document.getElementById('totalPrice').textContent = `${total.toLocaleString()}원`;
    },

    // 메뉴 추가
    addMoreMenu() {
        this.state.currentStep = 'menuSelection';
        this.state.selectedMenu = null;
        this.state.selectedTemperature = null;
        this.state.selectedSize = null;
        this.state.selectedSeat = null;
        this.state.selectedTime = null;
        this.state.quantity = 1;
        
        // 화면의 선택 상태 초기화
        document.querySelectorAll('.menu-item').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('quantityDisplay').textContent = '1';
        this.updateKioskStep();
        const menuTitle = this.menus[this.state.store].menuTitle;
        this.speakMessage(menuTitle);
    },

    // 미션에서 옵션 정보 추출 (온도, 사이즈 등)
    extractMissionOptions(mission, menuName) {
        const options = {};
        
        // 온도 검증
        if (mission.includes('따뜻한') || mission.includes('뜨거운') || mission.includes('핫')) {
            if (mission.includes(menuName)) options.temperature = 'HOT';
        }
        if (mission.includes('차가운') || mission.includes('시원한') || mission.includes('아이스') || mission.includes('냉')) {
            if (mission.includes(menuName)) options.temperature = 'ICE';
        }
        
        // 사이즈 검증
        if (mission.includes('Large')) options.size = 'Large';
        if (mission.includes('Regular')) options.size = 'Regular';
        
        // 좌석 정보는 정확한 좌석 번호가 필요하므로 건너뜀
        
        return options;
    },

    // 미션에서 요구한 항목 추출 (메뉴별 개수 포함)
    extractMissionItems() {
        const mission = this.state.currentMission;
        if (!mission) return {};
        
        // 미션 문자열에서 메뉴별 개수 추출
        const missionItemCounts = {};
        const allMenus = this.menus[this.state.store].items;
        
        allMenus.forEach(menu => {
            // 정확한 메뉴명으로 먼저 검색
            let regex = new RegExp(menu.name, 'g');
            let matches = mission.match(regex) || [];
            
            // 정확한 메뉴명이 없으면, 메뉴명의 일부로 검색 (예: "성인"을 "일반(성인)"에서 찾기)
            if (matches.length === 0) {
                const menuParts = menu.name.split('(')[0].trim(); // "일반"
                const menuKeyword = menu.name.match(/\\(([^)]+)\\)/)?.[1] || ''; // "성인"
                if (menuKeyword) {
                    regex = new RegExp(menuKeyword, 'g');
                    matches = mission.match(regex) || [];
                }
            }
            
            if (matches.length > 0) {
                missionItemCounts[menu.name] = matches.length;
            }
        });
        
        return missionItemCounts;
    },

    // 결제 페이지로
    goToPayment() {
        // 미션 검증: 정확하게 미션의 메뉴와 옵션을 담아야 함
        const missionItemCounts = this.extractMissionItems();
        
        if (Object.keys(missionItemCounts).length > 0) {
            // 장바구니에서 메뉴별 총 개수 계산
            const cartItemCounts = {};
            const cartDetails = {}; // 메뉴별 옵션 정보 저장
            
            this.state.cart.forEach(item => {
                cartItemCounts[item.menu] = (cartItemCounts[item.menu] || 0) + item.quantity;
                
                if (!cartDetails[item.menu]) {
                    cartDetails[item.menu] = {
                        temperature: item.temperature || '',
                        size: item.size || '',
                        seat: item.seat || '',
                        time: item.time || ''
                    };
                }
            });
            
            // 1. 미션에 있는 메뉴들이 충분히 담겨있는지 확인
            const missingItems = [];
            Object.entries(missionItemCounts).forEach(([menuName, requiredCount]) => {
                const cartCount = cartItemCounts[menuName] || 0;
                if (cartCount < requiredCount) {
                    const shortage = requiredCount - cartCount;
                    missingItems.push(`${menuName} ${shortage}개`);
                }
            });
            
            if (missingItems.length > 0) {
                const message = `아직 ${missingItems.join(', ')}을(를) 담지 않았습니다.`;
                this.speakMessage(message);
                this.showWarningModal('❌ 메뉴 부족', message, this.state.currentMission, missingItems);
                return;
            }
            
            // 2. 미션에 없는 메뉴가 담겨있는지 확인 (추가로 주문한 메뉴 체크)
            const extraItems = [];
            Object.keys(cartItemCounts).forEach(menuName => {
                if (!missionItemCounts[menuName]) {
                    extraItems.push(`${menuName}`);
                }
            });
            
            if (extraItems.length > 0) {
                const message = `미션과 일치하지 않은 메뉴가 담겨있습니다.`;
                this.speakMessage(`미션과 일치하지 않은 ${extraItems.join(', ')}이(가) 담겨있습니다. 미션을 다시 확인해주세요.`);
                this.showWarningModal('❌ 미션 불일치', message, this.state.currentMission, extraItems);
                return;
            }
            
            // 3. 옵션(온도 등) 검증
            const mission = this.state.currentMission;
            for (let [menuName, count] of Object.entries(missionItemCounts)) {
                const cartDetail = cartDetails[menuName];
                const missionOptions = this.extractMissionOptions(mission, menuName);
                
                // 온도 검증 (카페 메뉴)
                if (missionOptions.temperature) {
                    if (cartDetail.temperature !== missionOptions.temperature) {
                        const tempName = missionOptions.temperature === 'HOT' ? '따뜻한' : '차가운';
                        const currentTemp = cartDetail.temperature === 'HOT' ? '따뜨한' : '차가운';
                        const message = `${menuName}의 온도가 미션과 맞지 않습니다.`;
                        this.speakMessage(message);
                        this.showWarningModal('🌡️ 온도 불일치', message, this.state.currentMission, [`${menuName}: ${tempName} 필요 (현재: ${currentTemp})`]);
                        return;
                    }
                }
            }
        }
        
        this.state.currentStep = 'payment';
        this.updateKioskStep();
        this.speakMessage('결제 방법을 선택해주세요.');
    },

    // 결제 방법 선택
    selectPayment(method) {
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        event.target.closest('.payment-btn').classList.add('selected');

        setTimeout(() => {
            this.showResult();
        }, 1000);
    },

    // 결과 화면 표시
    showResult() {
        this.stopTimer();
        
        const resultItems = document.getElementById('resultItems');
        let html = '';
        let total = 0;

        const cartGrouped = {};
        this.state.cart.forEach(item => {
            const key = `${item.menu}-${item.temperature}-${item.size}-${item.seat}-${item.time}`;
            if (!cartGrouped[key]) {
                cartGrouped[key] = { ...item, quantity: 0 };
            }
            cartGrouped[key].quantity++;
        });

        for (const [key, item] of Object.entries(cartGrouped)) {
            let itemPrice = item.price;
            if (item.size === 'Large') itemPrice += 1000;
            const itemTotal = itemPrice * item.quantity;
            total += itemTotal;
            
            const details = [item.menu, item.temperature, item.size, item.seat, item.time].filter(d => d);
            html += `✓ ${details.join(' / ')} x${item.quantity}<br>`;
        }

        resultItems.innerHTML = html;
        document.getElementById('resultTotalPrice').textContent = `${total.toLocaleString()}원`;
        document.getElementById('waitingNumber').textContent = Math.floor(Math.random() * 30) + 1;
        
        // 소요 시간 표시
        const elapsedTimeDisplay = document.getElementById('elapsedTime');
        if (elapsedTimeDisplay) {
            const minutes = Math.floor(this.state.elapsedTime / 60);
            const seconds = this.state.elapsedTime % 60;
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            elapsedTimeDisplay.textContent = `⏱️ 소요 시간: ${timeStr}`;
            elapsedTimeDisplay.style.display = 'block';
        }

        // 연습 기록 저장
        const record = {
            date: new Date().toLocaleString('ko-KR'),
            store: this.state.storeName,
            difficulty: this.difficultySettings[this.state.difficulty].name,
            mission: this.state.currentMission,
            orderItems: html,
            totalPrice: total,
            elapsedTime: this.state.difficulty === 'real' ? `${String(Math.floor(this.state.elapsedTime / 60)).padStart(2, '0')}:${String(this.state.elapsedTime % 60).padStart(2, '0')}` : '제한 없음'
        };
        this.state.practiceHistory.push(record);
        localStorage.setItem('practiceHistory', JSON.stringify(this.state.practiceHistory));

        this.showScreen('resultScreen');
        this.speakMessage('주문이 완료되었습니다. 대기 번호를 확인해주세요.');
    },

    // 다시 연습하기
    restartPractice() {
        this.resetState();
        this.state.store = this.state.store || 'cafe';
        this.state.storeName = this.menus[this.state.store].name;
        this.state.difficulty = this.state.difficulty || 'practice';
        this.state.hintLevel = 0;
        this.showMission();
    },

    // 힌트 표시
    showHint() {
        if (!this.difficultySettings[this.state.difficulty].showHints) {
            this.speakMessage('실전 모드에서는 힌트가 제한되어 있습니다.');
            return;
        }

        const stepHints = {
            menuSelection: this.hints.menuSelection,
            optionSelection: this.hints.optionSelection,
            quantitySelection: this.hints.quantitySelection,
            orderConfirm: this.hints.orderConfirm
        };

        const hints = stepHints[this.state.currentStep] || [];
        const hint = hints[Math.min(this.state.hintLevel, hints.length - 1)];

        const hintContent = document.getElementById('hintContent');
        hintContent.textContent = hint;

        const hintModal = document.getElementById('hintModal');
        hintModal.classList.add('active');

        this.speakMessage(hint);
        this.state.hintLevel++;
    },

    // 경고 모달 표시
    showWarningModal(title, message, mission, items) {
        const warningModal = document.getElementById('warningModal');
        document.getElementById('warningTitle').textContent = title;
        document.getElementById('warningMessage').textContent = message;
        document.getElementById('warningMissionText').textContent = mission;
        
        const missingMenusDisplay = document.getElementById('missingMenusDisplay');
        const missingMenusText = document.getElementById('missingMenusText');
        
        if (items && items.length > 0) {
            missingMenusDisplay.style.display = 'block';
            missingMenusText.textContent = items.join(', ');
        } else {
            missingMenusDisplay.style.display = 'none';
        }
        
        warningModal.classList.add('active');
    },

    // 힌트 닫기
    closeHint() {
        const hintModal = document.getElementById('hintModal');
        hintModal.classList.remove('active');
    },

    // 도움말 표시 (힌트와 동일)
    showHelp() {
        this.showHint();
    },

    // 가이드 표시
    showGuide() {
        const guideModal = document.getElementById('guideModal');
        guideModal.classList.add('active');
    },

    // 가이드 닫기
    closeGuide() {
        const guideModal = document.getElementById('guideModal');
        guideModal.classList.remove('active');
    },

    // 나의 기록 표시
    showHistory() {
        this.showScreen('historyScreen');
        const records = this.state.practiceHistory || [];
        const historyList = document.getElementById('historyList');
        
        if (records.length === 0) {
            historyList.innerHTML = '<p class="empty-history">완료한 미션이 없습니다.</p>';
            return;
        }

        let html = '<div class="history-records">';
        records.forEach((record, index) => {
            html += `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-number">#${records.length - index}</span>
                        <span class="history-date">${record.date}</span>
                    </div>
                    <div class="history-content">
                        <p><strong>가게:</strong> ${record.store}</p>
                        <p><strong>난이도:</strong> ${record.difficulty}</p>
                        <p><strong>미션:</strong> ${record.mission}</p>
                        <p><strong>주문 항목:</strong><br>${record.orderItems}</p>
                        <p><strong>총액:</strong> ${record.totalPrice.toLocaleString()}원</p>
                        <p><strong>소요 시간:</strong> ${record.elapsedTime}</p>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        historyList.innerHTML = html;
    },

    // 음성 안내 토글
    toggleVoice() {
        this.state.voiceEnabled = !this.state.voiceEnabled;
        const voiceBtn = document.querySelector('.btn-voice');
        if (this.state.voiceEnabled) {
            voiceBtn.style.opacity = '1';
            this.speakMessage('음성 안내가 활성화되었습니다.');
        } else {
            voiceBtn.style.opacity = '0.5';
        }
    },

    // 타이머 시작
    startTimer(seconds) {
        this.state.timeRemaining = seconds;
        this.state.startTime = Date.now();
        const timerContainer = document.getElementById('timerContainer');
        if (timerContainer) timerContainer.style.display = 'flex';
        this.updateTimerDisplay();
        this.state.timerInterval = setInterval(() => this.updateTimer(), 100);
    },

    // 타이머 업데이트
    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.state.elapsedTime = elapsed;
        this.state.timeRemaining = Math.max(0, 120 - elapsed);
        this.updateTimerDisplay();
        if (this.state.timeRemaining <= 0) {
            this.stopTimer();
            this.timeoutHandler();
        }
    },

    // 타이머 화면 업데이트
    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        if (!timerDisplay) return;
        
        const minutes = Math.floor(this.state.timeRemaining / 60);
        const seconds = this.state.timeRemaining % 60;
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        timerDisplay.textContent = timeStr;
        
        // 30초 이하일 때 경고 표시
        if (this.state.timeRemaining <= 30 && this.state.timeRemaining > 0) {
            timerDisplay.classList.add('warning');
        } else {
            timerDisplay.classList.remove('warning');
        }
        
        // 10초 이하일 때 배경색 변경
        const kioskScreen = document.getElementById('kioskScreen');
        if (this.state.timeRemaining <= 10 && this.state.timeRemaining > 0) {
            const opacity = (10 - this.state.timeRemaining) / 10;
            kioskScreen.style.backgroundColor = `rgba(255, 0, 0, ${opacity * 0.2})`;
        } else if (this.state.timeRemaining > 10) {
            kioskScreen.style.backgroundColor = 'white';
        }
    },

    // 타이머 중지
    stopTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }
        const timerContainer = document.getElementById('timerContainer');
        if (timerContainer) timerContainer.style.display = 'none';
    },

    // 타이머 종료 처리
    timeoutHandler() {
        // 모든 상태에서 시간 초과 화면 표시
        
        const warningModal = document.getElementById('warningModal');
        const warningMessage = document.getElementById('warningMessage');
        const timeoutPriceDisplay = document.getElementById('timeoutPriceDisplay');
        
        warningMessage.textContent = '⏱️ 시간 초과!';
        
        // 가격 계산
        const cartGrouped = {};
        this.state.cart.forEach(item => {
            const key = `${item.menu}-${item.temperature}-${item.size}-${item.seat}-${item.time}`;
            if (!cartGrouped[key]) {
                cartGrouped[key] = { ...item, quantity: 0 };
            }
            cartGrouped[key].quantity++;
        });
        
        let total = 0;
        let cartDisplay = '';
        for (const [key, item] of Object.entries(cartGrouped)) {
            let itemPrice = item.price;
            if (item.size === 'Large') itemPrice += 1000;
            const itemTotal = itemPrice * item.quantity;
            total += itemTotal;
            const details = [item.menu, item.temperature, item.size, item.seat, item.time].filter(d => d);
            cartDisplay += `✓ ${details.join(' / ')} x${item.quantity}<br>`;
        }
        
        // 장바구니 항목 표시
        const timeoutCartDisplay = document.getElementById('timeoutCartDisplay');
        if (timeoutCartDisplay) {
            timeoutCartDisplay.innerHTML = cartDisplay || '<p>주문 항목이 없습니다.</p>';
        }
        
        // 가격 표시
        const timeoutTotalPrice = document.getElementById('timeoutTotalPrice');
        if (timeoutTotalPrice) {
            timeoutTotalPrice.textContent = `💰 주문 합계: ${total.toLocaleString()}원`;
        }
        
        // 타임아웃 가격 표시 영역 표시
        if (timeoutPriceDisplay) {
            timeoutPriceDisplay.style.display = 'block';
        }
        
        warningModal.classList.add('active');
        this.speakMessage('시간이 초과되었습니다. 주문이 취소되었습니다.');
    },

    // 경고 모달 닫기
    closeWarning() {
        const warningModal = document.getElementById('warningModal');
        const missingMenusDisplay = document.getElementById('missingMenusDisplay');
        const timeoutPriceDisplay = document.getElementById('timeoutPriceDisplay');
        
        warningModal.classList.remove('active');
        if (missingMenusDisplay) missingMenusDisplay.style.display = 'none';
        if (timeoutPriceDisplay) timeoutPriceDisplay.style.display = 'none';
        
        // 주문 확인 화면으로 이동 (장바구니와 미션 유지)
        this.state.currentStep = 'orderConfirm';
        this.updateKioskStep();
        this.updateOrderConfirm();
    },

    speakMessage(message) {
        if (!this.state.voiceEnabled) return;

        if (this.state.difficulty === 'practice' || this.state.voiceEnabled) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;

            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
        }
    }
};

// 페이지 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
    const hintModal = document.getElementById('hintModal');
    const guideModal = document.getElementById('guideModal');

    if (e.target === hintModal) {
        app.closeHint();
    }
    if (e.target === guideModal) {
        app.closeGuide();
    }
});

