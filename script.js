
// --- DOM Elementer ---
const valueInput = document.getElementById('valueInput');
const fromUnitSelect = document.getElementById('fromUnit');
const toUnitSelect = document.getElementById('toUnit');
const convertButton = document.getElementById('convertButton');
const revealButton = document.getElementById('revealButton');
const resultText = document.getElementById('resultText');
const explanationArea = document.getElementById('explanationArea');
const explanationSteps = document.getElementById('explanationSteps');

// --- Lagre siste konverteringsdata for forklaring ---
let lastConversionData = null;

// --- Konverteringsfaktorer (relativt til en baseenhet per type) ---
// Base: meter (m), kvadratmeter (m2), kubikkmeter (m3), liter (l)
const factors = {
    // Lengde (base: m)
    'mm': { type: 'length', factor: 0.001 },
    'cm': { type: 'length', factor: 0.01 },
    'dm': { type: 'length', factor: 0.1 },
    'm':  { type: 'length', factor: 1 },
    'km': { type: 'length', factor: 1000 },
    // Areal (base: m2)
    'mm2': { type: 'area', factor: 0.000001 },
    'cm2': { type: 'area', factor: 0.0001 },
    'dm2': { type: 'area', factor: 0.01 },
    'm2':  { type: 'area', factor: 1 },
    'km2': { type: 'area', factor: 1000000 },
    'maal':{ type: 'area', factor: 1000 }, // 1 mål = 1 dekar = 1000 m²
    'hektar':{ type: 'area', factor: 10000 }, // 1 hektar = 10 000 m²
    // Volum - Rommål (base: m3)
    'mm3': { type: 'volume', factor: 1e-9 }, // 1*10^-9
    'cm3': { type: 'volume', factor: 1e-6 }, // 1*10^-6 (også lik mL)
    'dm3': { type: 'volume', factor: 0.001 }, // (også lik L)
    'm3':  { type: 'volume', factor: 1 },
    // Volum - Litermål (base: l)
    'ml': { type: 'liquid', factor: 0.001 },
    'cl': { type: 'liquid', factor: 0.01 },
    'dl': { type: 'liquid', factor: 0.1 },
    'l':  { type: 'liquid', factor: 1 },
};

// --- Hjelpefunksjoner ---

function getUnitInfo(unit) {
    return factors[unit];
}

function formatNumber(num) {
    if (num === null || num === undefined) return "";
    // Viser mange desimaler for små tall, ellers begrenser
    if (Math.abs(num) < 0.0001 && num !== 0) {
        return num.toExponential(4); // Vitenskapelig notasjon for veldig små tall
    }
    // Begrenser til maks 6 desimaler, fjerner unødvendige 0'er
    return parseFloat(num.toFixed(6)).toString();
}

// --- Hovedfunksjon for Konvertering ---
function handleConversion() {
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;
    const valueStr = valueInput.value;

    // Validering
    if (!valueStr || !fromUnit || !toUnit) {
        resultText.textContent = "⚠️ Fyll inn verdi og velg begge enheter!";
        resultText.style.color = "orange";
        revealButton.disabled = true;
        explanationArea.classList.add('hidden');
        lastConversionData = null;
        return;
    }

    const value = parseFloat(valueStr);
    if (isNaN(value)) {
        resultText.textContent = "⚠️ Ugyldig tall!";
        resultText.style.color = "orange";
        revealButton.disabled = true;
        explanationArea.classList.add('hidden');
        lastConversionData = null;
        return;
    }

    const fromInfo = getUnitInfo(fromUnit);
    const toInfo = getUnitInfo(toUnit);

    let result = null;
    let conversionPossible = false;

    // 1. Konvertering innenfor samme type (lengde til lengde, areal til areal etc.)
    if (fromInfo.type === toInfo.type) {
        const valueInBaseUnit = value * fromInfo.factor;
        result = valueInBaseUnit / toInfo.factor;
        conversionPossible = true;
    }
    // 2. Konvertering mellom Volum (Rommål) og Volum (Litermål) - BROENE!
    else if (fromInfo.type === 'volume' && toInfo.type === 'liquid') {
        // Fra rommål (m3 base) til liter (l base)
        // Kobling: 1 dm³ = 1 L  => 0.001 m³ = 1 L
        const valueInCubicMeters = value * fromInfo.factor;
        const valueInLiters = valueInCubicMeters / 0.001; // Konverter til liter (base for liquid)
        result = valueInLiters / toInfo.factor; // Konverter fra liter-base til ønsket liquid-enhet
        conversionPossible = true;
    }
    else if (fromInfo.type === 'liquid' && toInfo.type === 'volume') {
        // Fra liter (l base) til rommål (m3 base)
        // Kobling: 1 L = 1 dm³ => 1 L = 0.001 m³
        const valueInLiters = value * fromInfo.factor; // Konverter til liter (base)
        const valueInCubicMeters = valueInLiters * 0.001; // Konverter til m³ (base for volume)
        result = valueInCubicMeters / toInfo.factor; // Konverter fra m³-base til ønsket volume-enhet
        conversionPossible = true;
    }

    // Vis resultat eller feilmelding
    if (conversionPossible && result !== null) {
        resultText.textContent = `${formatNumber(value)} ${fromUnit} = ${formatNumber(result)} ${toUnit}`;
        resultText.style.color = 'var(--secondary-color)'; // Tilbakestill farge
        revealButton.disabled = false; // Aktiver forklaringsknappen
        explanationArea.classList.add('hidden'); // Skjul gammel forklaring
        // Lagre data for "Avslør Hemmeligheten"
        lastConversionData = {
            value,
            fromUnit,
            toUnit,
            result,
            fromInfo,
            toInfo
        };
    } else {
        resultText.textContent = `⛔ Kan ikke konvertere mellom ${fromInfo.type} og ${toInfo.type} direkte her.`;
        resultText.style.color = "red";
        revealButton.disabled = true;
        explanationArea.classList.add('hidden');
        lastConversionData = null;
    }
}

// --- Funksjon for å generere og vise forklaring ---
function handleReveal() {
    if (!lastConversionData) return;

    const { value, fromUnit, toUnit, result, fromInfo, toInfo } = lastConversionData;
    explanationSteps.innerHTML = ''; // Tøm gamle steg

    let steps = [];
    steps.push(`<p>Vi skal konvertere <strong>${formatNumber(value)} ${fromUnit}</strong> til <strong>${toUnit}</strong>.</p>`);

    // --- Forklaring Logikk ---

    // Spesialtilfelle: Direkte bro dm³ <-> L eller cm³ <-> mL
    if ((fromUnit === 'dm3' && toUnit === 'l') || (fromUnit === 'l' && toUnit === 'dm3')) {
        steps.push(`<p>Husk den viktige broen: <strong>1 dm³ = 1 L</strong>.</p>`);
        steps.push(`<p>Derfor er ${formatNumber(value)} ${fromUnit} direkte lik <strong>${formatNumber(result)} ${toUnit}</strong>.</p>`);
    } else if ((fromUnit === 'cm3' && toUnit === 'ml') || (fromUnit === 'ml' && toUnit === 'cm3')) {
         steps.push(`<p>Husk den andre viktige broen: <strong>1 cm³ = 1 mL</strong>.</p>`);
         steps.push(`<p>Derfor er ${formatNumber(value)} ${fromUnit} direkte lik <strong>${formatNumber(result)} ${toUnit}</strong>.</p>`);
    }
    // Konvertering innen samme type
    else if (fromInfo.type === toInfo.type) {
        steps.push(`<p>Begge enhetene er av typen <strong>${fromInfo.type}</strong>.</p>`);

        // Finn base faktor (f.eks. m til cm -> 100)
        // Dette er litt forenklet - vi burde egentlig vise omgjøring via base-enheten (m, m², m³, l)
        let baseUnit = '';
        let simpleFactor = null;
        let factorExplanation = '';

        if(fromInfo.type === 'length') baseUnit = 'm';
        if(fromInfo.type === 'area') baseUnit = 'm²';
        if(fromInfo.type === 'volume') baseUnit = 'm³';
        if(fromInfo.type === 'liquid') baseUnit = 'L'; // Bruker L som "base" for forklaring her

        // Prøver å finne en enkel faktor (cm -> m, L -> dL etc) for pedagogikken
        if (fromInfo.type === 'length' || fromInfo.type === 'liquid') {
             // Forenklet logikk for direkte steg (f.eks. m -> cm, L -> dL)
             // En mer robust løsning ville hatt en tabell for direkte faktorer mellom vanlige enheter
             simpleFactor = fromInfo.factor / toInfo.factor;
             if (simpleFactor === 10 || simpleFactor === 100 || simpleFactor === 1000 || simpleFactor === 0.1 || simpleFactor === 0.01 || simpleFactor === 0.001) {
                 factorExplanation = `Forholdet mellom ${fromUnit} og ${toUnit} er <strong>${1/simpleFactor}</strong> (eller ${simpleFactor}).`;
             } else {
                 factorExplanation = `Vi går via baseenheten (${baseUnit}).`;
                 simpleFactor = null; // Tilbakestill hvis ikke enkel faktor
             }
        } else {
            // For areal og volum er det vanskeligere med "enkle" faktorer, gå via base
             factorExplanation = `Vi går via baseenheten (${baseUnit}).`;
        }

        steps.push(`<p>${factorExplanation}</p>`);

        const valueInBaseUnit = value * fromInfo.factor;
        const finalResult = valueInBaseUnit / toInfo.factor; // = result

        if (!simpleFactor || fromInfo.type === 'area' || fromInfo.type === 'volume' ) {
            steps.push(`<p>1. Gjør om fra ${fromUnit} til baseenheten (${baseUnit}):<br> ${formatNumber(value)} ${fromUnit} * (${formatNumber(fromInfo.factor)} ${baseUnit}/${fromUnit}) = <strong>${formatNumber(valueInBaseUnit)} ${baseUnit}</strong>.</p>`);
            steps.push(`<p>2. Gjør om fra baseenheten (${baseUnit}) til ${toUnit}:<br> ${formatNumber(valueInBaseUnit)} ${baseUnit} / (${formatNumber(toInfo.factor)} ${baseUnit}/${toUnit}) = <strong>${formatNumber(finalResult)} ${toUnit}</strong>.</p>`);
        } else {
             // Bruk den enkle faktoren
             const direction = simpleFactor > 1 ? 'mindre' : 'større';
             const operation = simpleFactor > 1 ? 'dele' : 'gange';
             const factorDisplay = simpleFactor > 1 ? simpleFactor : 1/simpleFactor;
              steps.push(`<p>Vi går fra ${fromUnit} til en <strong>${direction}</strong> enhet (${toUnit}). Da må vi <strong>${operation}</strong> med faktoren <strong>${formatNumber(factorDisplay)}</strong>.</p>`);
              steps.push(`<p>Regnestykke: ${formatNumber(value)} ${operation === 'gange' ? '*' : '/'} ${formatNumber(factorDisplay)} = <strong>${formatNumber(finalResult)} ${toUnit}</strong>.</p>`);
        }

         // Legg til dimensjonsforklaring for Areal/Volum
         if(fromInfo.type === 'area'){
             steps.push(`<p>💡 Husk: For areal (2D) må vi tenke på faktoren i <strong>to</strong> retninger (lengde * bredde). Hvis lengdefaktoren er f.eks. 10, blir arealfaktoren 10 * 10 = 100.</p>`);
         } else if (fromInfo.type === 'volume') {
              steps.push(`<p>💡 Husk: For volum (3D) må vi tenke på faktoren i <strong>tre</strong> retninger (lengde * bredde * høyde). Hvis lengdefaktoren er f.eks. 10, blir volumfaktoren 10 * 10 * 10 = 1000.</p>`);
         }


    }
    // Konvertering mellom volum og liquid (som ikke er direkte dm³/L eller cm³/mL)
    else if ((fromInfo.type === 'volume' && toInfo.type === 'liquid') || (fromInfo.type === 'liquid' && toInfo.type === 'volume')) {
        steps.push(`<p>Dette er en konvertering mellom rommål (som ${fromUnit}) og litermål (som ${toUnit}).</p>`);
        steps.push(`<p>Vi bruker broene: <strong>1 dm³ = 1 L</strong> og/eller <strong>1 cm³ = 1 mL</strong>.</p>`);

        if (fromInfo.type === 'volume') { // Fra volum til liquid
            const valueInCubicMeters = value * fromInfo.factor;
            const valueInLiters = valueInCubicMeters / 0.001;
            steps.push(`<p>1. Gjør om ${fromUnit} til liter (via m³):<br> ${formatNumber(value)} ${fromUnit} → ${formatNumber(valueInCubicMeters)} m³ → <strong>${formatNumber(valueInLiters)} L</strong>.</p>`);
            if (toUnit !== 'l') {
                 const finalResult = valueInLiters / toInfo.factor;
                 steps.push(`<p>2. Gjør om fra liter til ${toUnit}:<br> ${formatNumber(valueInLiters)} L → <strong>${formatNumber(finalResult)} ${toUnit}</strong>.</p>`);
            } else {
                 steps.push(`<p>Siden vi skulle til Liter, er vi ferdige.</p>`);
            }
        } else { // Fra liquid til volum
             const valueInLiters = value * fromInfo.factor;
             const valueInCubicMeters = valueInLiters * 0.001;
              steps.push(`<p>1. Gjør om ${fromUnit} til liter:<br> ${formatNumber(value)} ${fromUnit} → <strong>${formatNumber(valueInLiters)} L</strong>.</p>`);
             steps.push(`<p>2. Gjør om liter til kubikkmeter (m³):<br> ${formatNumber(valueInLiters)} L → <strong>${formatNumber(valueInCubicMeters)} m³</strong>.</p>`);
             if (toUnit !== 'm3') {
                 const finalResult = valueInCubicMeters / toInfo.factor;
                 steps.push(`<p>3. Gjør om fra m³ til ${toUnit}:<br> ${formatNumber(valueInCubicMeters)} m³ → <strong>${formatNumber(finalResult)} ${toUnit}</strong>.</p>`);
             } else {
                  steps.push(`<p>Siden vi skulle til m³, er vi ferdige.</p>`);
             }
        }
    }

    // Sett inn genererte steg i HTML
    explanationSteps.innerHTML = steps.join('');
    explanationArea.classList.remove('hidden'); // Vis forklaringen
}


// --- Event Listeners ---
convertButton.addEventListener('click', handleConversion);
revealButton.addEventListener('click', handleReveal);

// Kjør en konvertering hvis verdier allerede er fylt ut (f.eks. ved refresh)
// Kan fjernes om ønskelig
// if (valueInput.value && fromUnitSelect.value && toUnitSelect.value) {
//    handleConversion();
// }
