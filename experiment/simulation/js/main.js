//Your JavaScript goes in here

        // State
        let powerOn = false;
        let selectedPort = null;
        let connections = [];
        let tempConnection = null;

        let inputsLocked = false;

        // Parameters for function generators only
        let func1 = { freq: 2, amp: 15, freqMax: 60, unit: 'MHz', color: 'orange' };
        let func2 = { freq: 2.5, amp: 15, freqMax: 60, unit: 'MHz', color: 'purple' };

        // Elements
        const powerBtn = document.getElementById('powerBtn');
        const resetConnectionsBtn = document.getElementById('resetConnectionsBtn');
        const statusMessage = document.getElementById('statusMessage');
        const bfskOutput = document.getElementById('bfskOutput');

        const funcFreq1Val = document.getElementById('funcFreq1Val');
        const funcAmp1Val = document.getElementById('funcAmp1Val');
        const funcFreq2Val = document.getElementById('funcFreq2Val');
        const funcAmp2Val = document.getElementById('funcAmp2Val');

        const waveCanvas = document.getElementById('waveCanvas');
        const ctx = waveCanvas.getContext('2d');

        const bfskCanvas = document.getElementById('bfskCanvas');
        const bfskCtx = bfskCanvas.getContext('2d');

        // Binary Input bits state, 8 bits
        const binaryBits = new Array(8).fill(false);

        // Setup canvas size for responsiveness
        function resizeCanvas() {
            waveCanvas.width = Math.min(window.innerWidth - 20, 1400);
            waveCanvas.height = 220;

            bfskCanvas.width = waveCanvas.width;
            bfskCanvas.height = 100;
        }
        resizeCanvas();
        window.addEventListener('resize', () => {
            resizeCanvas();
            drawAllWaves();
            drawFinalBFSKWaveform();
        });

        // Power toggle
        powerBtn.onclick = () => {
            powerOn = !powerOn;
            powerBtn.textContent = powerOn ? "Power OFF" : "Power ON";
            drawAllWaves();
            updateBFSKOutput();
        };

        // Reset connections and unlock inputs
        resetConnectionsBtn.onclick = () => {
            connections.forEach(conn => {
                document.getElementById('kit').removeChild(conn.element);
                if (conn.label) document.getElementById('kit').removeChild(conn.label);
            });
            connections = [];
            inputsLocked = false;
            enableInputs(true);
            updateBFSKOutput();
        };

        function showStatus(message, isError = true) {
            statusMessage.textContent = message;
            statusMessage.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
            statusMessage.style.display = 'block';
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 2000);
        }

        // Disable or enable all inputs and frequency/amp controls based on locked state
        function enableInputs(enable) {
            const allCheckboxes = document.querySelectorAll('#binaryInput input[type="checkbox"]');
            allCheckboxes.forEach(cb => cb.disabled = !enable);

            // Disable/enable the function generator buttons
            document.getElementById('func1FreqDownBtn').disabled = !enable;
            document.getElementById('func1FreqUpBtn').disabled = !enable;
            document.getElementById('func1AmpDownBtn').disabled = !enable;
            document.getElementById('func1AmpUpBtn').disabled = !enable;
            document.getElementById('func2FreqDownBtn').disabled = !enable;
            document.getElementById('func2FreqUpBtn').disabled = !enable;
            document.getElementById('func2AmpDownBtn').disabled = !enable;
            document.getElementById('func2AmpUpBtn').disabled = !enable;
        }

        // Port click events
        document.querySelectorAll('.port').forEach(port => {
            port.addEventListener('mousedown', function (e) {
                e.stopPropagation();

                if (!inputsLocked) {
                    // Before locking inputs, ensure binary input is given (at least one bit set)
                    if (!validateUserInputs()) {
                        showStatus("Please provide binary input and set function generator parameters before making connections");
                        return;
                    }
                }

                if (!inputsLocked) {
                    // Lock inputs on first successful connection attempt
                    inputsLocked = true;
                    enableInputs(false);
                }

                document.querySelectorAll('.port').forEach(p => p.classList.remove('selected'));

                this.classList.add('selected');
                selectedPort = this;

                if (this.getAttribute('data-type') === 'output') {
                    document.addEventListener('mousemove', moveTempConnection);
                    document.addEventListener('mouseup', releaseTempConnection);
                }
            });
        });

        // Validate binary input and function generator params before allowing connections
        function validateUserInputs() {
            // Validate binary input at least one checked
            const binaryCheckboxes = document.querySelectorAll('#binaryInput input[type="checkbox"]');
            let binarySet = false;
            for (let cb of binaryCheckboxes) {
                if (cb.checked) {
                    binarySet = true;
                    break;
                }
            }
            if (!binarySet) return false;

            // Validate function generator frequency and amplitude are positive non-zero
            if (func1.freq <= 0 || func2.freq <= 0) return false;
            if (func1.amp <= 0 || func2.amp <= 0) return false;
            return true;
        }

        function moveTempConnection(e) {
            if (!selectedPort || selectedPort.getAttribute('data-type') !== 'output') return;
            const kit = document.getElementById('kit');
            const kitRect = kit.getBoundingClientRect();
            const portRect = selectedPort.getBoundingClientRect();

            const startX = portRect.left + portRect.width / 2 - kitRect.left;
            const startY = portRect.top + portRect.height / 2 - kitRect.top;
            const endX = e.clientX - kitRect.left;
            const endY = e.clientY - kitRect.top;

            if (!tempConnection) {
                tempConnection = document.createElement('div');
                tempConnection.className = 'temp-connection';
                kit.appendChild(tempConnection);
            }

            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

            tempConnection.style.left = startX + 'px';
            tempConnection.style.top = startY + 'px';
            tempConnection.style.width = length + 'px';
            tempConnection.style.transform = 'rotate(' + angle + 'deg)';
        }

        function releaseTempConnection(e) {
            document.removeEventListener('mousemove', moveTempConnection);
            document.removeEventListener('mouseup', releaseTempConnection);

            if (tempConnection) {
                document.getElementById('kit').removeChild(tempConnection);
                tempConnection = null;
            }

            if (!selectedPort) return;

            const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
            const targetPort = hoveredElement?.closest('.port');

            if (targetPort && targetPort !== selectedPort) {
                tryCreateConnection(selectedPort, targetPort);
            } else {
                showStatus("Incomplete connection");
            }

            selectedPort.classList.remove('selected');
            selectedPort = null;
        }

        function tryCreateConnection(sourcePort, targetPort) {
            const sourceType = sourcePort.getAttribute('data-type');
            const targetType = targetPort.getAttribute('data-type');

            if (sourceType !== 'output' || targetType !== 'input') {
                showStatus("Can only connect output to input");
                return false;
            }

            const targetModule = targetPort.getAttribute('data-module');
            const targetIndex = targetPort.getAttribute('data-index');

            if (connections.some(conn =>
                conn.targetModule === targetModule && conn.targetIndex === targetIndex
            )) {
                showStatus("Input port already connected");
                return false;
            }

            const sourceModule = sourcePort.getAttribute('data-module');
            const sourceIndex = sourcePort.getAttribute('data-index');
            const targetInputType = targetPort.getAttribute('data-input');

            let isValid = false;
            let errorMessage = "Invalid connection for BFSK circuit";

            if ((sourceModule === 'funcGen1') && sourceIndex === '0') {
                isValid = (targetModule === 'balMod1' && targetInputType === 'carrier');
                errorMessage = "Function Generator 1 must connect to Modulator1's carrier input";
            }
            else if ((sourceModule === 'funcGen2') && sourceIndex === '0') {
                isValid = (targetModule === 'balMod2' && targetInputType === 'carrier');
                errorMessage = "Function Generator 2 must connect to Modulator2's carrier input";
            }
            else if (sourceModule === 'binaryModule' && sourceIndex === '0') {
                isValid = (targetModule === 'balMod1' && targetInputType === 'signal') ||
                    (targetModule === 'notGate' && targetIndex === '0');
                errorMessage = "Binary output must connect to Modulator1's signal input or NOT gate";
            }
            else if (sourceModule === 'notGate' && sourceIndex === '0') {
                isValid = (targetModule === 'balMod2' && targetInputType === 'signal');
                errorMessage = "NOT gate must connect to Modulator2's signal input";
            }
            else if ((sourceModule === 'balMod1' || sourceModule === 'balMod2') && sourceIndex === '0') {
                isValid = (targetModule === 'summingAmplifier' && (targetIndex === '0' || targetIndex === '1'));
                errorMessage = "Modulator outputs must connect to Summing Amplifier";
            }
            else if (sourceModule === 'summingAmplifier' && sourceIndex === '0') {
                isValid = false;
                errorMessage = "Summing Amplifier output is the final BFSK output";
            }

            if (!isValid) {
                showStatus(errorMessage);
                return false;
            }

            createConnection(sourcePort, targetPort);
            showStatus("Connection successful!", false);
            updateBFSKOutput();
            return true;
        }

        function createConnection(sourcePort, targetPort) {
            const kit = document.getElementById('kit');
            const kitRect = kit.getBoundingClientRect();
            const sourceRect = sourcePort.getBoundingClientRect();
            const targetRect = targetPort.getBoundingClientRect();

            const sourceX = sourceRect.left + sourceRect.width / 2 - kitRect.left;
            const sourceY = sourceRect.top + sourceRect.height / 2 - kitRect.top;
            const targetX = targetRect.left + targetRect.width / 2 - kitRect.left;
            const targetY = targetRect.top + targetRect.height / 2 - kitRect.top;

            const connection = document.createElement('div');
            connection.className = 'connection';
            connection.style.left = sourceX + 'px';
            connection.style.top = sourceY + 'px';

            const length = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
            const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * 180 / Math.PI;

            connection.style.width = length + 'px';
            connection.style.transform = 'rotate(' + angle + 'deg)';

            kit.appendChild(connection);

            connection.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    kit.removeChild(connection);
                    if (connection.label) kit.removeChild(connection.label);
                    connections = connections.filter(conn => conn.element !== connection);
                    updateBFSKOutput();
                }
            });

            connections.push({
                sourceModule: sourcePort.getAttribute('data-module'),
                sourceIndex: sourcePort.getAttribute('data-index'),
                targetModule: targetPort.getAttribute('data-module'),
                targetIndex: targetPort.getAttribute('data-index'),
                element: connection
            });
        }

        function updateBFSKOutput() {
            const hasFunc1ToMod1 = connections.some(conn =>
                conn.sourceModule === 'funcGen1' && conn.targetModule === 'balMod1' && conn.targetIndex === '1');

            const hasBinaryToMod1 = connections.some(conn =>
                conn.sourceModule === 'binaryModule' && conn.targetModule === 'balMod1' && conn.targetIndex === '0');

            const hasFunc2ToMod2 = connections.some(conn =>
                conn.sourceModule === 'funcGen2' && conn.targetModule === 'balMod2' && conn.targetIndex === '1');

            const hasBinaryToNot = connections.some(conn =>
                conn.sourceModule === 'binaryModule' && conn.targetModule === 'notGate' && conn.targetIndex === '0');

            const hasNotToMod2 = connections.some(conn =>
                conn.sourceModule === 'notGate' && conn.targetModule === 'balMod2' && conn.targetIndex === '0');

            const hasMod1ToSum = connections.some(conn =>
                conn.sourceModule === 'balMod1' && conn.targetModule === 'summingAmplifier');

            const hasMod2ToSum = connections.some(conn =>
                conn.sourceModule === 'balMod2' && conn.targetModule === 'summingAmplifier');

            const allConnectionsMade = hasFunc1ToMod1 && hasBinaryToMod1 && hasFunc2ToMod2 &&
                hasBinaryToNot && hasNotToMod2 && hasMod1ToSum && hasMod2ToSum;

            if (allConnectionsMade) {
                bfskOutput.textContent = "BFSK Output: Connected and ready";
                bfskOutput.style.color = "green";
                bfskCanvas.style.display = "block";
                drawFinalBFSKWaveform();
            } else {
                bfskOutput.textContent = "BFSK Output: Incomplete connections";
                bfskOutput.style.color = "red";
                bfskCanvas.style.display = "none";
                bfskCtx.clearRect(0, 0, bfskCanvas.width, bfskCanvas.height);
            }

            drawAllWaves();
        }

        function changeFrequency(gen, delta) {
            if (inputsLocked) {
                showStatus("Reset connections to modify parameters");
                return;
            }
            if (gen === 'func1') {
                func1.freq = Math.min(Math.max(func1.freq + delta, 0.1), func1.freqMax);
                funcFreq1Val.textContent = func1.freq.toFixed(2);
            } else if (gen === 'func2') {
                func2.freq = Math.min(Math.max(func2.freq + delta, 0.1), func2.freqMax);
                funcFreq2Val.textContent = func2.freq.toFixed(2);
            }
            drawAllWaves();
        }

        function changeAmplitude(gen, delta) {
            if (inputsLocked) {
                showStatus("Reset connections to modify parameters");
                return;
            }
            if (gen === 'func1') {
                func1.amp = Math.min(Math.max(func1.amp + delta, 0), 40);
                funcAmp1Val.textContent = func1.amp.toFixed(1);
            } else if (gen === 'func2') {
                func2.amp = Math.min(Math.max(func2.amp + delta, 0), 40);
                funcAmp2Val.textContent = func2.amp.toFixed(1);
            }
            drawAllWaves();
        }

        // Forbid binary inputs change after locking
        document.querySelectorAll('#binaryInput input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (inputsLocked) {
                    e.preventDefault();
                    cb.checked = binaryBits[parseInt(cb.getAttribute('data-bit'))];
                    showStatus("Reset connections to change binary input");
                    return;
                }
                const bitIndex = parseInt(cb.getAttribute('data-bit'));
                binaryBits[bitIndex] = cb.checked;
                if (powerOn) {
                    drawAllWaves();
                    updateBFSKOutput();
                }
            });
        });

        function drawSineWave(freqMHz, amp, color, yOffset) {
            const points = 1000;
            const twoPi = 2 * Math.PI;
            const canvasW = waveCanvas.width;

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            let cycles = 10;
            let phaseInc = (twoPi * cycles) / points;

            for (let i = 0; i <= points; i++) {
                let x = (i / points) * canvasW;
                let angle = phaseInc * i;
                let val = Math.sin(angle);
                let y = yOffset - val * (amp / 40) * 60;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        function drawNRZ(bits, yOffset) {
            const canvasW = waveCanvas.width;
            const bitWidth = canvasW / bits.length;
            const highY = yOffset - 40;
            const lowY = yOffset + 40;

            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.beginPath();

            let x = 0;
            ctx.moveTo(x, bits[0] ? highY : lowY);

            for (let i = 0; i < bits.length; i++) {
                x = i * bitWidth;
                ctx.lineTo(x, bits[i] ? highY : lowY);
                ctx.lineTo(x + bitWidth, bits[i] ? highY : lowY);
            }
            ctx.stroke();
        }

        function drawAllWaves() {
            ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

            const centerY1 = 100;
            const centerY2 = 170;
            const centerY3 = 200;

            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, centerY1);
            ctx.lineTo(waveCanvas.width, centerY1);
            ctx.moveTo(0, centerY2);
            ctx.lineTo(waveCanvas.width, centerY2);
            ctx.moveTo(0, centerY3);
            ctx.lineTo(waveCanvas.width, centerY3);
            ctx.stroke();

            if (!powerOn) {
                ctx.fillStyle = '#a00';
                ctx.font = 'bold 30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Power OFF', waveCanvas.width / 2, waveCanvas.height / 2);
                return;
            }

            // Draw function generators for visualization
            drawSineWave(func1.freq, func1.amp, func1.color, centerY1);
            drawSineWave(func2.freq, func2.amp, func2.color, centerY2);

            drawNRZ(binaryBits, centerY3);
        }

        function drawFinalBFSKWaveform() {
            if (!powerOn) {
                bfskCtx.clearRect(0, 0, bfskCanvas.width, bfskCanvas.height);
                return;
            }
            bfskCtx.clearRect(0, 0, bfskCanvas.width, bfskCanvas.height);

            const bits = binaryBits;
            const canvasW = bfskCanvas.width;
            const canvasH = bfskCanvas.height;
            const bitWidth = canvasW / bits.length;
            const pointsPerBit = 150;

            bfskCtx.strokeStyle = 'purple';
            bfskCtx.lineWidth = 2;
            bfskCtx.beginPath();

            // BFSK waveform modulated by bits using func1 freq for bit=1, func2 freq for bit=0
            for (let i = 0; i < bits.length; i++) {
                const freq = bits[i] ? func1.freq : func2.freq;
                const amp = bits[i] ? func1.amp : func2.amp;
                const cycles = freq * (bitWidth / canvasW) * 10;

                for (let p = 0; p <= pointsPerBit; p++) {
                    const x = i * bitWidth + (p / pointsPerBit) * bitWidth;
                    const angle = 2 * Math.PI * cycles * (p / pointsPerBit);
                    const y = canvasH / 2 - Math.sin(angle) * ((amp / 40) * 40);

                    if (i === 0 && p === 0) {
                        bfskCtx.moveTo(x, y);
                    } else {
                        bfskCtx.lineTo(x, y);
                    }
                }
            }
            bfskCtx.stroke();
        }

        funcFreq1Val.textContent = func1.freq.toFixed(2);
        funcAmp1Val.textContent = func1.amp.toFixed(1);
        funcFreq2Val.textContent = func2.freq.toFixed(2);
        funcAmp2Val.textContent = func2.amp.toFixed(1);

        drawAllWaves();
        updateBFSKOutput();

  
