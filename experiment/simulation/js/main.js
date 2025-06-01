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
        const showOscilloscopeBtn = document.getElementById('showOscilloscopeBtn');
        const statusMessage = document.getElementById('statusMessage');

        const funcFreq1Val = document.getElementById('funcFreq1Val');
        const funcAmp1Val = document.getElementById('funcAmp1Val');
        const funcFreq2Val = document.getElementById('funcFreq2Val');
        const funcAmp2Val = document.getElementById('funcAmp2Val');

        // Oscilloscope elements
        const oscilloscopeModal = document.getElementById('oscilloscopeModal');
        const oscilloscopeClose = document.getElementById('oscilloscopeClose');
        const oscilloscopeDisplay = document.getElementById('oscilloscopeDisplay');
        const oscilloscopeCtx = oscilloscopeDisplay.getContext('2d');
        const waveformInput = document.getElementById('inputWave');
        const waveformFunc1 = document.getElementById('funcGen1Wave');
        const waveformFunc2 = document.getElementById('funcGen2Wave');
        const waveformOutput = document.getElementById('outputWave');

        // Binary Input bits state, 8 bits
        const binaryBits = new Array(8).fill(false);

        // Setup canvas size for responsiveness
        function resizeCanvas() {            
            oscilloscopeDisplay.width = document.getElementById('oscilloscopeContent').offsetWidth - 40;
            oscilloscopeDisplay.height = 300;
        }

        window.addEventListener('resize', () => {
            resizeCanvas();
            if (oscilloscopeModal.style.display === 'block') {
                drawOscilloscope();
            }
        });

        // Oscilloscope functionality
        showOscilloscopeBtn.onclick = () => {
            if (!powerOn) {
                showStatus("Please turn power ON first");
                return;
            }
            
            oscilloscopeModal.style.display = 'flex';
            drawOscilloscope();
        };

        oscilloscopeClose.onclick = () => {
            oscilloscopeModal.style.display = 'none';
        };

        window.onclick = (event) => {
            if (event.target === oscilloscopeModal) {
                oscilloscopeModal.style.display = 'none';
            }
        };

        // Add event listeners for waveform selection
        waveformInput.addEventListener('change', drawOscilloscope);
        waveformFunc1.addEventListener('change', drawOscilloscope);
        waveformFunc2.addEventListener('change', drawOscilloscope);
        waveformOutput.addEventListener('change', drawOscilloscope);

        function drawOscilloscope() {
            const canvasW = oscilloscopeDisplay.width;
            const canvasH = oscilloscopeDisplay.height;
            
            // Clear the display with a dark background
            oscilloscopeCtx.fillStyle = '#111';
            oscilloscopeCtx.fillRect(0, 0, canvasW, canvasH);
            
            // Draw grid with brighter lines
            oscilloscopeCtx.strokeStyle = '#333';
            oscilloscopeCtx.lineWidth = 1;
            
            // Vertical grid lines
            for (let x = 0; x < canvasW; x += canvasW / 10) {
                oscilloscopeCtx.beginPath();
                oscilloscopeCtx.moveTo(x, 0);
                oscilloscopeCtx.lineTo(x, canvasH);
                oscilloscopeCtx.stroke();
            }
            
            // Horizontal grid lines
            for (let y = 0; y < canvasH; y += canvasH / 8) {
                oscilloscopeCtx.beginPath();
                oscilloscopeCtx.moveTo(0, y);
                oscilloscopeCtx.lineTo(canvasW, y);
                oscilloscopeCtx.stroke();
            }
            
            // Center line (brighter)
            oscilloscopeCtx.strokeStyle = '#666';
            oscilloscopeCtx.beginPath();
            oscilloscopeCtx.moveTo(0, canvasH/2);
            oscilloscopeCtx.lineTo(canvasW, canvasH/2);
            oscilloscopeCtx.stroke();
            
            // Determine which waveform to show
            let selectedWaveform = 'input';
            if (waveformInput.checked) selectedWaveform = 'input';
            if (waveformFunc1.checked) selectedWaveform = 'func1';
            if (waveformFunc2.checked) selectedWaveform = 'func2';
            if (waveformOutput.checked) selectedWaveform = 'output';
            
            // Set waveform color based on selection
            let waveColor = '#0f0'; // Green
            if (selectedWaveform === 'func1') waveColor = func1.color;
            if (selectedWaveform === 'func2') waveColor = func2.color;
            if (selectedWaveform === 'output') waveColor = 'purple';
            
            oscilloscopeCtx.strokeStyle = waveColor;
            oscilloscopeCtx.lineWidth = 2;
            oscilloscopeCtx.beginPath();
            
            const bits = binaryBits;
            const bitWidth = canvasW / bits.length;
            const pointsPerBit = 100;
            
            if (selectedWaveform === 'input') {
                // Draw NRZ input signal
                const highY = canvasH / 4;
                const lowY = (canvasH / 4) * 3;
                
                let x = 0;
                oscilloscopeCtx.moveTo(x, bits[0] ? highY : lowY);

                for (let i = 0; i < bits.length; i++) {
                    x = i * bitWidth;
                    oscilloscopeCtx.lineTo(x, bits[i] ? highY : lowY);
                    oscilloscopeCtx.lineTo(x + bitWidth, bits[i] ? highY : lowY);
                }
            } 
            else if (selectedWaveform === 'func1') {
                // Draw Function Generator 1 waveform
                for (let i = 0; i < bits.length; i++) {
                    for (let p = 0; p <= pointsPerBit; p++) {
                        const x = i * bitWidth + (p / pointsPerBit) * bitWidth;
                        const angle = 2 * Math.PI * func1.freq * (p / pointsPerBit) * 2;
                        const y = canvasH / 2 - Math.sin(angle) * ((func1.amp / 40) * (canvasH/2 - 10));

                        if (i === 0 && p === 0) {
                            oscilloscopeCtx.moveTo(x, y);
                        } else {
                            oscilloscopeCtx.lineTo(x, y);
                        }
                    }
                }
            }
            else if (selectedWaveform === 'func2') {
                // Draw Function Generator 2 waveform
                for (let i = 0; i < bits.length; i++) {
                    for (let p = 0; p <= pointsPerBit; p++) {
                        const x = i * bitWidth + (p / pointsPerBit) * bitWidth;
                        const angle = 2 * Math.PI * func2.freq * (p / pointsPerBit) * 2;
                        const y = canvasH / 2 - Math.sin(angle) * ((func2.amp / 40) * (canvasH/2 - 10));

                        if (i === 0 && p === 0) {
                            oscilloscopeCtx.moveTo(x, y);
                        } else {
                            oscilloscopeCtx.lineTo(x, y);
                        }
                    }
                }
            }
            else if (selectedWaveform === 'output') {
                // Only draw BFSK output if all connections are made
                const allConnectionsMade = checkAllConnections();
                if (!allConnectionsMade) return;
                
                // Draw BFSK output waveform
                for (let i = 0; i < bits.length; i++) {
                    const freq = bits[i] ? func1.freq : func2.freq;
                    const amp = bits[i] ? func1.amp : func2.amp;
                    
                    for (let p = 0; p <= pointsPerBit; p++) {
                        const x = i * bitWidth + (p / pointsPerBit) * bitWidth;
                        const angle = 2 * Math.PI * freq * (p / pointsPerBit) * 2;
                        const y = canvasH / 2 - Math.sin(angle) * ((amp / 40) * (canvasH/2 - 10));

                        if (i === 0 && p === 0) {
                            oscilloscopeCtx.moveTo(x, y);
                        } else {
                            oscilloscopeCtx.lineTo(x, y);
                        }
                    }
                }
            }
            
            oscilloscopeCtx.stroke();
            
            // Add time markers
            oscilloscopeCtx.fillStyle = 'yellow';
            oscilloscopeCtx.font = '12px Arial';
            for (let i = 0; i <= bits.length; i++) {
                const x = i * bitWidth;
                oscilloscopeCtx.fillText(i.toString(), x - 5, canvasH - 10);
            }
        }

        // Power toggle function
        powerBtn.onclick = () => {
            powerOn = !powerOn;
        
            // Update button appearance
            powerBtn.textContent = powerOn ? "Power OFF" : "Power ON";
            powerBtn.className = powerOn ? "on" : "off";
        
            // Update system state
            updateBFSKOutput();
        };

        // Initialize button state
        powerBtn.className = "off"; // Start in OFF (red) state

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

        // Handle port selection (for both mouse and touch)
        function handlePortSelection(port, event) {
            event.preventDefault();
            event.stopPropagation();

            // Prevent page scrolling during connection
            document.body.classList.add('connecting');

            if (!inputsLocked) {
                // Before locking inputs, ensure binary input is given (at least one bit set)
                if (!validateUserInputs()) {
                    showStatus("Please provide binary input and set function generator parameters before making connections");
                    document.body.classList.remove('connecting');
                    return;
                }
            }

            if (!inputsLocked) {
                // Lock inputs on first successful connection attempt
                inputsLocked = true;
                enableInputs(false);
            }

            document.querySelectorAll('.port').forEach(p => p.classList.remove('selected'));

            port.classList.add('selected');
            selectedPort = port;

            if (port.getAttribute('data-type') === 'output') {
                document.addEventListener('mousemove', moveTempConnection);
                document.addEventListener('mouseup', releaseTempConnection);
                document.addEventListener('touchmove', handleTouchMove, {passive: false});
                document.addEventListener('touchend', handleTouchEnd);
            }
        }

        // Handle touch movement
        function handleTouchMove(e) {
            e.preventDefault();
            if (!selectedPort || selectedPort.getAttribute('data-type') !== 'output') return;
            const touch = e.touches[0];
            moveTempConnection(touch);
        }

        // Handle touch end
        function handleTouchEnd(e) {
            // Clean up the connecting class
            document.body.classList.remove('connecting');
            
            if (!selectedPort) return;
            
            const touch = e.changedTouches[0];
            const hoveredElement = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetPort = hoveredElement?.closest('.port');

            if (targetPort && targetPort !== selectedPort) {
                tryCreateConnection(selectedPort, targetPort);
            } else {
                showStatus("Incomplete connection");
            }

            selectedPort.classList.remove('selected');
            selectedPort = null;
            
            // Clean up temp connection if it exists
            if (tempConnection) {
                document.getElementById('kit').removeChild(tempConnection);
                tempConnection = null;
            }
            
            // Remove event listeners
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('mousemove', moveTempConnection);
            document.removeEventListener('mouseup', releaseTempConnection);
        }

        // Port click events (both mouse and touch)
        document.querySelectorAll('.port').forEach(port => {
            port.addEventListener('mousedown', function(e) {
                handlePortSelection(this, e);
            });
            
            port.addEventListener('touchstart', function(e) {
                handlePortSelection(this, e);
            }, {passive: false});
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

            const clientX = e.clientX || e.touches?.[0]?.clientX;
            const clientY = e.clientY || e.touches?.[0]?.clientY;
            
            if (!clientX || !clientY) return;

            const startX = portRect.left + portRect.width / 2 - kitRect.left;
            const startY = portRect.top + portRect.height / 2 - kitRect.top;
            const endX = clientX - kitRect.left;
            const endY = clientY - kitRect.top;

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
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);

            // Clean up the connecting class
            document.body.classList.remove('connecting');

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

        // Check if all required connections are made
        function checkAllConnections() {
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

            return hasFunc1ToMod1 && hasBinaryToMod1 && hasFunc2ToMod2 &&
                hasBinaryToNot && hasNotToMod2 && hasMod1ToSum && hasMod2ToSum;
        }

        function updateBFSKOutput() {
            const allConnectionsMade = checkAllConnections();
            // No need to update any display since we removed the output elements
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
            if (oscilloscopeModal.style.display === 'block') {
                drawOscilloscope();
            }
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
            if (oscilloscopeModal.style.display === 'block') {
                drawOscilloscope();
            }
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
                if (powerOn && oscilloscopeModal.style.display === 'block') {
                    drawOscilloscope();
                }
            });
        });

        // Initialize
        funcFreq1Val.textContent = func1.freq.toFixed(2);
        funcAmp1Val.textContent = func1.amp.toFixed(1);
        funcFreq2Val.textContent = func2.freq.toFixed(2);
        funcAmp2Val.textContent = func2.amp.toFixed(1);
        resizeCanvas();