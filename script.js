let currentStep = 0;
const totalSteps = 5;

// User Selections
let userSelections = {
    category: null,
    powertrain: null,
    weight: null,
    wltcInput: null,
    mode: 'wltc', // 'wltc', 'jc08', '1015'
    finalWltc: null // the converted value used for calculation
};

document.addEventListener('DOMContentLoaded', () => {
    // Input validation logic
    const weightInput = document.getElementById('weight');
    const wltcInput = document.getElementById('wltc');
    const btnNextWeight = document.getElementById('btn-next-weight');
    const btnNextWltc = document.getElementById('btn-next-wltc');

    weightInput.addEventListener('input', () => {
        const val = parseFloat(weightInput.value);
        if (val >= 500 && val <= 5000) {
            btnNextWeight.disabled = false;
        } else {
            btnNextWeight.disabled = true;
        }
    });

    wltcInput.addEventListener('input', () => {
        const val = parseFloat(wltcInput.value);
        if (val >= 1 && val <= 100) {
            btnNextWltc.disabled = false;
        } else {
            btnNextWltc.disabled = true;
        }
        updateConvertedDisplay();
    });

    // Enter key support for quick navigation
    weightInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !btnNextWeight.disabled) nextStep(4);
    });

    wltcInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !btnNextWltc.disabled) calculateAndShowResult();
    });
});

// Mode Selection Logic
function selectMode(modeStr) {
    userSelections.mode = modeStr;
    const segments = document.querySelectorAll('#mode-selector .segment');
    segments.forEach(seg => seg.classList.remove('active'));

    // Find the right segment (simple index trick based on order)
    if (modeStr === 'wltc') segments[0].classList.add('active');
    else if (modeStr === 'jc08') segments[1].classList.add('active');
    else if (modeStr === '1015') segments[2].classList.add('active');

    updateConvertedDisplay();
    // Refocus input
    document.getElementById('wltc').focus();
}

function updateConvertedDisplay() {
    const inputVal = parseFloat(document.getElementById('wltc').value);
    const displayEl = document.getElementById('converted-display');
    const valEl = document.getElementById('converted-val');

    if (isNaN(inputVal) || inputVal <= 0) {
        displayEl.style.opacity = '0';
        userSelections.finalWltc = null;
        return;
    }

    let converted = convertToWltc(inputVal, userSelections.mode);
    userSelections.finalWltc = converted;

    if (userSelections.mode === 'wltc') {
        displayEl.style.opacity = '0';
    } else {
        valEl.textContent = converted.toFixed(1);
        displayEl.style.opacity = '1';
    }
}

function convertToWltc(val, mode) {
    if (mode === 'wltc') return val;

    let jc08Val = val;
    if (mode === '1015') {
        // 10・15 -> JC08
        jc08Val = val * 0.897;
    }

    // JC08 -> WLTC
    let wltcVal = jc08Val * 0.86;

    // Floor to 1 decimal place (e.g. 21.45 -> 21.4)
    return Math.floor(wltcVal * 10) / 10;
}

// Stepped navigation logic
function nextStep(stepIndex) {
    hideStep(currentStep, 'up');
    currentStep = stepIndex;
    showStep(currentStep, 'up');

    // Auto focus
    if (stepIndex === 3) setTimeout(() => document.getElementById('weight').focus(), 300);
    if (stepIndex === 4) setTimeout(() => document.getElementById('wltc').focus(), 300);
}

function prevStep(stepIndex) {
    hideStep(currentStep, 'down');
    currentStep = stepIndex;
    showStep(currentStep, 'down');
}

function hideStep(index, direction) {
    const el = document.getElementById(`step-${index}`);
    if (!el) return;
    el.classList.remove('active');

    if (direction === 'up') {
        el.style.transform = 'translateY(-100px)';
    } else {
        el.style.transform = 'translateY(100px)';
    }
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
}

function showStep(index, direction) {
    const el = document.getElementById(`step-${index}`);
    if (!el) return;

    if (direction === 'up') {
        el.style.transform = 'translateY(100px)';
    } else {
        el.style.transform = 'translateY(-100px)';
    }

    // Force reflow
    void el.offsetWidth;

    el.classList.add('active');
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
}

function selectOption(type, value, nextStepIndex) {
    userSelections[type] = value;

    // Visually update cards
    const section = document.getElementById(`step-${currentStep}`);
    const cards = section.querySelectorAll('.select-card');
    cards.forEach(card => card.classList.remove('selected'));

    // Find clicked element to highlight it (not super precise via DOM matching, but works for our simple UI onClick inline setup)
    event.currentTarget.classList.add('selected');

    // Auto progress after a tiny delay for UX
    setTimeout(() => {
        nextStep(nextStepIndex);
    }, 250);
}

// Logic implementations

function calculateTargetFE(weight, powertrain) {
    // Determine base gasoline FE
    let baseFE = 9.5;
    if (weight < 2759) {
        baseFE = (-0.00000247 * Math.pow(weight, 2)) - (0.000852 * weight) + 30.65;
    }

    // Apply powertrain coefficient (Diesel 1.1, LPG 0.74, based on 2030 standards logic mapping)
    if (powertrain === 'diesel') {
        baseFE = baseFE * 1.1;
    } else if (powertrain === 'lpg') {
        baseFE = baseFE * 0.74;
    }
    // Note: HEV/PHEV use gasoline standards logic internally, evaluating WtW later in full scale, 
    // but for this simple calculator we treat them as gas equivalent base limit.

    return Math.round(baseFE * 10) / 10;
}

function determineStarsAndMessage(rate) {
    let stars = 0;
    if (rate >= 100) stars = 5;
    else if (rate >= 95) stars = 4.5;
    else if (rate >= 90) stars = 4;
    else if (rate >= 85) stars = 3.5;
    else if (rate >= 80) stars = 3;
    else if (rate >= 75) stars = 2.5;
    else if (rate >= 70) stars = 2;
    else if (rate >= 65) stars = 1.5;
    else if (rate >= 60) stars = 1;
    else if (rate >= 55) stars = 0.5;

    // Generate nuanced contextual message based on completely selected specs
    const { category, powertrain, weight, wltc } = userSelections;

    let msg = "";
    if (rate >= 100) {
        if (powertrain === 'phev' || powertrain === 'hev') {
            msg = `最新の電動化技術が光る${getCategoryName(category)}ですね！2030年度基準も余裕でクリアです。`;
        } else {
            msg = "ガソリン車・ディーゼル車でありながら基準クリア！驚異的な燃費性能です。";
        }
    } else if (category === 'sports') {
        if (rate >= 80) msg = "走りの楽しさとエコを両立した、本当に素晴らしいスポーツカーですね！";
        else msg = "走る楽しさやロマンが詰まった一台！エコドライブを意識できれば完璧ですね。";
    } else if (category === 'suv' || category === 'minivan') {
        if (rate >= 80) msg = "大きくて重いボディなのにこれだけ優秀なのは、パワートレインの恩恵ですね！";
        else msg = "大きくパワフルなお車ですね！休日のレジャーや旅行に大活躍してくれる相棒です。";
    } else if (category === 'kei' || weight < 1000) {
        msg = "軽くて小回りのきく、日常生活の強い味方ですね！維持費も優しく機能的なお車です。";
    } else if (rate >= 80) {
        msg = "かなり優秀な燃費です！バランスの取れた素晴らしいお車ですね。";
    } else {
        msg = "通勤やお出かけに活躍する、バランスの良いおなじみのお車ですね！";
    }

    return { stars, msg };
}

function getCategoryName(id) {
    const map = {
        'compact': 'コンパクトカー',
        'sedan': 'セダン・ハッチバック',
        'suv': 'SUV',
        'minivan': 'ミニバン',
        'sports': 'スポーツカー',
        'kei': '軽自動車'
    };
    return map[id] || 'お車';
}

function renderStarsHTML(starCount) {
    let html = '';
    const fullStars = Math.floor(starCount);
    const hasHalfStar = starCount % 1 !== 0;

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            html += '<span style="color:var(--star-gold);">★</span>';
        } else if (i === fullStars && hasHalfStar) {
            html += '<span style="position:relative; display:inline-block;">' +
                '<span style="position:absolute; left:0; width:50%; overflow:hidden; color:var(--star-gold);">★</span>' +
                '<span style="color:var(--star-empty);">★</span>' +
                '</span>';
        } else {
            html += '<span style="color:var(--star-empty);">★</span>';
        }
    }
    return html;
}

function calculateAndShowResult() {
    userSelections.weight = parseFloat(document.getElementById('weight').value);

    // Use the converted WLTC value if available, else fallback to raw input (if user skipped updating somehow)
    if (userSelections.finalWltc === null) {
        updateConvertedDisplay();
    }

    // Fallbacks just in case step skipping occurred in testing
    if (!userSelections.category) userSelections.category = 'sedan';
    if (!userSelections.powertrain) userSelections.powertrain = 'gasoline';

    const targetFE = calculateTargetFE(userSelections.weight, userSelections.powertrain);
    const achievementRate = (userSelections.finalWltc / targetFE) * 100;
    const result = determineStarsAndMessage(achievementRate);

    // Update DOM
    document.getElementById('target-fe').textContent = targetFE.toFixed(1);
    document.getElementById('achievement-rate').textContent = achievementRate.toFixed(1);
    document.getElementById('achievement-text').textContent = result.msg;
    document.getElementById('star-count-display').textContent = result.stars;
    document.getElementById('sticker-stars-overlay').innerHTML = renderStarsHTML(result.stars);

    // Color code achievement rate text
    const rateEl = document.getElementById('achievement-rate').parentElement;
    if (achievementRate >= 100) {
        rateEl.style.color = 'var(--success-color)';
    } else if (achievementRate >= 80) {
        rateEl.style.color = 'var(--star-gold)';
    } else {
        rateEl.style.color = '#ff3b30';
    }

    // Go to final step
    nextStep(5);
}

function resetApp() {
    document.getElementById('weight').value = '';
    document.getElementById('wltc').value = '';
    document.getElementById('btn-next-weight').disabled = true;
    document.getElementById('btn-next-wltc').disabled = true;

    // Reset mode
    selectMode('wltc');

    // Clear selections visually
    document.querySelectorAll('.select-card').forEach(n => n.classList.remove('selected'));

    userSelections = { category: null, powertrain: null, weight: null, wltcInput: null, mode: 'wltc', finalWltc: null };

    hideStep(currentStep, 'down');
    currentStep = 0;
    showStep(currentStep, 'down');
}

// Sharing logic
async function shareResult() {
    const rate = document.getElementById('achievement-rate').textContent;
    const stars = document.getElementById('star-count-display').textContent;
    const type = getCategoryName(userSelections.category);

    const text = `私の愛車(${type})の2030年度燃費基準達成率は【${rate}%】！\n獲得した星は【${stars}個】でした！\n最新の燃費基準を皆も測ってみよう！ 🚗✨\n#EcoCalcPro #2030燃費基準`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: '2030年度燃費基準結果',
                text: text,
                url: window.location.href, // This works if hosted online
            });
        } catch (err) {
            console.log("シェアをキャンセルしたか、エラーが発生しました:", err);
        }
    } else {
        // Fallback to Twitter
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
        window.open(url, '_blank');
    }
}
