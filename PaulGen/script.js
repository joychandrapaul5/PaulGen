document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const inputField = document.getElementById('digitsInput');
    const generateBtn = document.getElementById('generateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const inputError = document.getElementById('inputError');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const progressText = document.getElementById('progressText');
    
    const counterBox = document.getElementById('counterBox');
    const counterValue = document.getElementById('counterValue');
    const resultsSection = document.getElementById('resultsSection');
    
    const copyBtn = document.getElementById('copyBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    
    const lengthsContainer = document.getElementById('lengthsContainer');
    
    const ascContainer = document.getElementById('ascContainer');
    const descContainer = document.getElementById('descContainer');
    const evenContainer = document.getElementById('evenContainer');
    const oddContainer = document.getElementById('oddContainer');
    const primeContainer = document.getElementById('primeContainer');
    
    const aiInsightText = document.getElementById('aiInsightText');

    let currentWorker = null;
    let store = null;

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        themeToggle.textContent = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    });

    // Input Validation: Numbers only, automatically remove duplicates, allow commas/spaces
    inputField.addEventListener('input', (e) => {
        // Get raw value
        let raw = e.target.value;
        // Keep only digits
        let digitsOnly = raw.replace(/[^0-9]/g, '');
        // Remove duplicates dynamically
        let uniqueDigits = Array.from(new Set(digitsOnly.split(''))).join('');
        // Max 10 digits
        if (uniqueDigits.length > 10) {
            uniqueDigits = uniqueDigits.slice(0, 10);
        }
        
        // We set the value to the clean unique digits continuously
        e.target.value = uniqueDigits;
        
        // Hide error
        if (uniqueDigits.length > 0) {
            inputError.style.display = 'none';
        }
    });

    generateBtn.addEventListener('click', () => {
        let digitsOnly = inputField.value.replace(/[^0-9]/g, '');
        let uniqueDigits = Array.from(new Set(digitsOnly.split(''))).join('');
        
        if (uniqueDigits.length === 0) {
            inputError.textContent = "Error: Please enter at least 1 digit.";
            inputError.style.display = 'block';
            return;
        }

        startCalculation(uniqueDigits.split(''));
    });

    resetBtn.addEventListener('click', () => {
        if (currentWorker) {
            currentWorker.terminate();
            currentWorker = null;
        }
        inputField.value = '';
        inputError.style.display = 'none';
        loadingIndicator.style.display = 'none';
        counterBox.style.display = 'none';
        resultsSection.style.display = 'none';
        inputField.focus();
    });

    function startCalculation(digitsArr) {
        if (currentWorker) {
            currentWorker.terminate();
        }
        
        const warningMsg = document.getElementById('warningMsg');
        if (digitsArr.length > 6) {
            warningMsg.style.display = 'block';
        } else {
            warningMsg.style.display = 'none';
        }

        store = {
            lengths: {},
            asc: [], desc: [], even: [], odd: [], prime: [],
            txtData: ["Number Pattern Generator Results\\n"],
            csvData: ["Category,Number"]
        };
        for(let i=1; i<=digitsArr.length; i++) store.lengths[i] = [];

        inputError.style.display = 'none';
        resultsSection.style.display = 'none';
        counterBox.style.display = 'none';
        loadingIndicator.style.display = 'block';
        progressText.textContent = "0";

        const workerCode = `
            self.onmessage = function(e) {
                const digits = e.data.digits;
                let count = 0;
                
                const maxLen = digits.length;
                let batch = {
                    lengths: {},
                    asc: [], desc: [], even: [], odd: [], prime: [],
                    txt: [], csv: []
                };
                for(let i=1; i<=maxLen; i++) batch.lengths[i] = [];
                
                const counts = {
                    lengths: {},
                    asc: 0, desc: 0, even: 0, odd: 0, prime: 0
                };
                for(let i=1; i<=maxLen; i++) counts.lengths[i] = 0;

                let batchCount = 0;
                const BATCH_SIZE = 50000;

                function flushBatch(isFinal) {
                    if (batchCount > 0 || isFinal) {
                        self.postMessage({
                            type: 'chunk',
                            batch: batch,
                            counts: counts,
                            count: count,
                            isFinal: isFinal
                        });
                        batch = {
                            lengths: {},
                            asc: [], desc: [], even: [], odd: [], prime: [],
                            txt: [], csv: []
                        };
                        for(let i=1; i<=maxLen; i++) batch.lengths[i] = [];
                        batchCount = 0;
                    }
                }

                function isPrime(num) {
                    if (num <= 1) return false;
                    if (num <= 3) return true;
                    if (num % 2 === 0 || num % 3 === 0) return false;
                    for (let i = 5; i * i <= num; i += 6) {
                        if (num % i === 0 || num % (i + 2) === 0) return false;
                    }
                    return true;
                }

                function isAscending(str) {
                    if (str.length < 2) return false;
                    for (let i = 1; i < str.length; i++) {
                        if (str[i] <= str[i-1]) return false;
                    }
                    return true;
                }

                function isDescending(str) {
                    if (str.length < 2) return false;
                    for (let i = 1; i < str.length; i++) {
                        if (str[i] >= str[i-1]) return false;
                    }
                    return true;
                }

                function* getPermutations(arr, k) {
                    const n = arr.length;
                    const result = new Array(k);
                    const used = new Array(n).fill(false);
                    
                    function* backtrack(depth) {
                        if (depth === k) {
                            yield result.join('');
                            return;
                        }
                        for (let i = 0; i < n; i++) {
                            if (!used[i]) {
                                used[i] = true;
                                result[depth] = arr[i];
                                yield* backtrack(depth + 1);
                                used[i] = false;
                            }
                        }
                    }
                    yield* backtrack(0);
                }

                for (let k = 1; k <= maxLen; k++) {
                    batch.txt.push("\\n--- " + k + " Digit Numbers ---");
                    const gen = getPermutations(digits, k);
                    for (const str of gen) {
                        count++;
                        if (count % 20000 === 0) {
                            self.postMessage({ type: 'progress', count: count });
                        }
                        
                        const num = parseInt(str, 10);
                        
                        counts.lengths[k]++;
                        batch.lengths[k].push(str);
                        
                        let isAsc = isAscending(str);
                        let isDesc = isDescending(str);
                        let isEv = (num % 2 === 0);
                        let isOd = (num % 2 !== 0);
                        let isPr = isPrime(num);

                        if (isAsc) { counts.asc++; batch.asc.push(str); }
                        if (isDesc) { counts.desc++; batch.desc.push(str); }
                        if (isEv) { counts.even++; batch.even.push(str); }
                        if (isOd) { counts.odd++; batch.odd.push(str); }
                        if (isPr) { counts.prime++; batch.prime.push(str); }

                        batch.txt.push(str);
                        batch.csv.push(k + " Digit," + str);
                        if (isAsc) batch.csv.push("Ascending," + str);
                        if (isDesc) batch.csv.push("Descending," + str);
                        if (isEv) batch.csv.push("Even," + str);
                        if (isOd) batch.csv.push("Odd," + str);
                        if (isPr) batch.csv.push("Prime," + str);

                        batchCount++;
                        if (batchCount >= BATCH_SIZE) {
                            flushBatch(false);
                        }
                    }
                }
                
                batch.txt.push("\\nTotal unique combinations generated: " + count);
                flushBatch(true);
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        currentWorker = new Worker(URL.createObjectURL(blob));

        currentWorker.onmessage = (e) => {
            if (e.data.type === 'progress') {
                progressText.textContent = e.data.count.toLocaleString();
            } else if (e.data.type === 'chunk') {
                const b = e.data.batch;
                for(let i=1; i<=digitsArr.length; i++) {
                    for(let j=0; j<b.lengths[i].length; j++) store.lengths[i].push(b.lengths[i][j]);
                }
                for(let j=0; j<b.asc.length; j++) store.asc.push(b.asc[j]);
                for(let j=0; j<b.desc.length; j++) store.desc.push(b.desc[j]);
                for(let j=0; j<b.even.length; j++) store.even.push(b.even[j]);
                for(let j=0; j<b.odd.length; j++) store.odd.push(b.odd[j]);
                for(let j=0; j<b.prime.length; j++) store.prime.push(b.prime[j]);
                
                for(let j=0; j<b.txt.length; j++) store.txtData.push(b.txt[j]);
                for(let j=0; j<b.csv.length; j++) store.csvData.push(b.csv[j]);

                if (e.data.isFinal) {
                    loadingIndicator.style.display = 'none';
                    renderResults(e.data.counts, e.data.count, digitsArr);
                }
            }
        };

        currentWorker.postMessage({ digits: digitsArr });
    }

    function setupLazyScroll(container, storeArray) {
        container.innerHTML = '';
        if (storeArray.length === 0) {
            container.innerHTML = '<span style="color: var(--text-color); opacity: 0.5;">None</span>';
            return;
        }
        
        let currentIndex = 0;
        function loadMore() {
            if (currentIndex < storeArray.length) {
                let nextChunk = storeArray.slice(currentIndex, currentIndex + 500);
                if (nextChunk.length > 0) {
                    container.insertAdjacentHTML('beforeend', '<span class="chip">' + nextChunk.join('</span><span class="chip">') + '</span>');
                    currentIndex += nextChunk.length;
                }
            }
        }
        
        // Initial render
        loadMore();

        container.addEventListener('scroll', () => {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 200) {
                loadMore();
            }
        });
    }

    const words = ["Zero", "Single", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

    function renderResults(counts, total, digitsArr) {
        counterBox.style.display = 'block';
        
        // Dynamic length containers
        lengthsContainer.innerHTML = '';
        for (let k = 1; k <= digitsArr.length; k++) {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            const header = document.createElement('div');
            header.className = 'card-header';
            
            const title = document.createElement('h3');
            title.textContent = (words[k] || k) + ' Digit Numbers';
            
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = counts.lengths[k].toLocaleString();
            
            header.appendChild(title);
            header.appendChild(badge);
            
            const chipsDiv = document.createElement('div');
            chipsDiv.className = 'number-chips';
            
            setupLazyScroll(chipsDiv, store.lengths[k]);
            
            card.appendChild(header);
            card.appendChild(chipsDiv);
            lengthsContainer.appendChild(card);
        }

        // Patterns
        setupLazyScroll(ascContainer, store.asc);
        setupLazyScroll(descContainer, store.desc);
        setupLazyScroll(evenContainer, store.even);
        setupLazyScroll(oddContainer, store.odd);
        setupLazyScroll(primeContainer, store.prime);
        
        document.getElementById('ascCount').textContent = counts.asc.toLocaleString();
        document.getElementById('descCount').textContent = counts.desc.toLocaleString();
        document.getElementById('evenCount').textContent = counts.even.toLocaleString();
        document.getElementById('oddCount').textContent = counts.odd.toLocaleString();
        document.getElementById('primeCount').textContent = counts.prime.toLocaleString();

        // Counter Animation
        let start = 0;
        const duration = 800;
        const startTime = performance.now();
        
        function animateCount(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const easeOut = progress * (2 - progress);
            counterValue.textContent = Math.floor(easeOut * total).toLocaleString();
            if (progress < 1) {
                requestAnimationFrame(animateCount);
            } else {
                counterValue.textContent = total.toLocaleString();
            }
        }
        requestAnimationFrame(animateCount);

        // AI Insight
        const len = digitsArr.length;
        let insight = `You entered <strong>${len} unique digit(s)</strong> (${digitsArr.join(', ')}). `;
        insight += `By iterating through all possible permutations of lengths 1 to ${len}, the mathematical formula \`sum(P(${len}, k)) for k=1..${len}\` yields a total of <strong>${total.toLocaleString()}</strong> unique numbers. `;
        if (len > 6) {
            insight += `<br><br>Generating permutations for ${len} digits is computationally heavy! We used background processing and progressive DOM rendering to seamlessly display massive datasets without freezing your browser.`;
        }
        
        let primes = counts.prime;
        insight += `<br><br>Insight: Discovered ${primes} prime numbers and ${counts.even} even numbers from the sample.`;
        aiInsightText.innerHTML = insight;

        resultsSection.style.display = 'flex';
    }

    copyBtn.addEventListener('click', () => {
        if (!store || !store.txtData.length) return;
        navigator.clipboard.writeText(store.txtData.join("\\n")).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        }).catch(err => {
            alert('Failed to copy. The dataset might be too large.');
        });
    });

    exportTxtBtn.addEventListener('click', () => {
        if (!store || !store.txtData.length) return;
        const blob = new Blob([store.txtData.join("\\n")], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Number_Patterns_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    exportCsvBtn.addEventListener('click', () => {
        if (!store || !store.csvData.length) return;
        const blob = new Blob([store.csvData.join("\\n")], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Number_Patterns_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });
});
