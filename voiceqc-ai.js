// voiceqc-ai.js
console.log("VoiceQC AI loaded");

document.addEventListener('DOMContentLoaded', () => {
    const ASSEMBLYAI_KEY = 'YOUR_ASSEMBLYAI_KEY';
    const GROQ_KEY = 'YOUR_GROQ_KEY';

    // State
    let audioFiles = [];
    let scriptData = [];

    // Elements
    const audioBtn = document.getElementById('audio-upload-btn');
    const audioInput = document.getElementById('audio-upload-input');
    const csvBtn = document.getElementById('csv-upload-btn');
    const csvInput = document.getElementById('csv-upload-input');
    const processBtn = document.getElementById('process-btn');
    const resultsSection = document.getElementById('results-section');
    const resultsTbody = document.getElementById('results-tbody');
    const progressIndicator = document.getElementById('progress-indicator');
    const audioZone = document.querySelectorAll('.upload-zone')[0];

    // Load persisted results
    loadPersistedResults();

    // STEP 2 - FILE HANDLING
    if(audioBtn) audioBtn.addEventListener('click', () => audioInput.click());
    if(csvBtn) csvBtn.addEventListener('click', () => csvInput.click());

    if(audioInput) {
        audioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                audioFiles = Array.from(e.target.files);
                audioBtn.textContent = `${audioFiles.length} File(s) Selected`;
                checkReady();
            }
        });
    }

    // Drag and drop for audio
    if(audioZone) {
        audioZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            audioZone.style.borderColor = 'var(--color-primary, #FF5B00)';
        });
        audioZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            audioZone.style.borderColor = '';
        });
        audioZone.addEventListener('drop', (e) => {
            e.preventDefault();
            audioZone.style.borderColor = '';
            if (e.dataTransfer.files.length > 0) {
                audioFiles = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.wav'));
                if(audioFiles.length > 0) {
                    audioBtn.textContent = `${audioFiles.length} File(s) Selected`;
                    checkReady();
                }
            }
        });
    }

    if(csvInput) {
        csvInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            csvBtn.textContent = file.name;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                parseCSV(text);
                checkReady();
            };
            reader.readAsText(file);
        });
    }

    function parseCSV(text) {
        scriptData = [];
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        let startIndex = 0;
        if (lines[0] && (lines[0].toLowerCase().includes('filename') || lines[0].toLowerCase().includes('script_text'))) {
            startIndex = 1;
        }
        
        for (let i = startIndex; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            
            let parts = [];
            let inQuotes = false;
            let current = '';
            for (let j = 0; j < line.length; j++) {
                if (line[j] === '"') {
                    inQuotes = !inQuotes;
                } else if (line[j] === ',' && !inQuotes) {
                    parts.push(current);
                    current = '';
                } else {
                    current += line[j];
                }
            }
            parts.push(current);
            
            if (parts.length >= 2) {
                scriptData.push({
                    filename: parts[0].trim(),
                    script_text: parts[1].trim()
                });
            }
        }
    }

    // STEP 3 - PROCESS BUTTON
    function checkReady() {
        if (audioFiles.length > 0 && scriptData.length > 0) {
            processBtn.style.display = 'block';
        } else {
            processBtn.style.display = 'none';
        }
    }

    if(processBtn) {
        processBtn.addEventListener('click', async () => {
            processBtn.disabled = true;
            processBtn.style.opacity = '0.5';
            resultsSection.style.display = 'block';
            resultsTbody.innerHTML = '';
            
            for (let i = 0; i < audioFiles.length; i++) {
                await processFile(audioFiles[i], i + 1, audioFiles.length);
            }
            
            progressIndicator.textContent = 'All files processed successfully.';
            processBtn.disabled = false;
            processBtn.style.opacity = '1';
        });
    }

    // STEP 4 - TRANSCRIPTION & STEP 5 - QC COMPARISON
    async function processFile(file, currentIndex, totalFiles) {
        try {
            progressIndicator.textContent = `Processing file ${currentIndex} of ${totalFiles}: ${file.name} - Uploading...`;
            
            // 1. Upload the audio file directly to AssemblyAI
            const fileData = await file.arrayBuffer();
            const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
                method: 'POST',
                headers: {
                    'authorization': ASSEMBLYAI_KEY,
                    'Content-Type': 'application/octet-stream'
                },
                body: fileData
            });
            const uploadResult = await uploadResponse.json();
            
            if (!uploadResponse.ok) {
                throw new Error(`AssemblyAI Upload Error: ${uploadResult.error || uploadResponse.statusText}`);
            }
            const upload_url = uploadResult.upload_url;
            
            progressIndicator.textContent = `Processing file ${currentIndex} of ${totalFiles}: ${file.name} - Transcribing...`;
            
            // 2. Request transcription
            const assemblyResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
                method: 'POST',
                headers: {
                    'authorization': ASSEMBLYAI_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({ audio_url: upload_url })
            });
            const assemblyData = await assemblyResponse.json();
            
            if (!assemblyResponse.ok) {
                throw new Error(`AssemblyAI Transcription Error: ${assemblyData.error || assemblyResponse.statusText}`);
            }
            const transcriptId = assemblyData.id;
            
            // 3. Poll until completed
            let transcriptText = '';
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: { 'authorization': ASSEMBLYAI_KEY }
                });
                const pollData = await pollResponse.json();
                
                if (!pollResponse.ok) {
                    throw new Error(`AssemblyAI Polling Error: ${pollData.error || pollResponse.statusText}`);
                }
                
                if (pollData.status === 'completed') {
                    transcriptText = pollData.text;
                    break;
                } else if (pollData.status === 'error') {
                    throw new Error(`AssemblyAI Error: ${pollData.error || 'Transcription failed'}`);
                }
            }
            
            progressIndicator.textContent = `Processing file ${currentIndex} of ${totalFiles}: ${file.name} - Analyzing...`;
            
            // 4. Match script and send to Groq
            const scriptObj = scriptData.find(s => s.filename === file.name);
            const expectedScript = scriptObj ? scriptObj.script_text : 'No matching script found';
            
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama3-70b-8192",
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content: "You are a voiceover QC specialist. Compare transcript vs expected script. Return ONLY JSON: { \"match_score\": 0-100, \"status\": \"Pass\" or \"Review Required\" or \"Fail\", \"issues\": [{\"type\": \"\", \"expected\": \"\", \"found\": \"\", \"severity\": \"\"}], \"summary\": \"one sentence\" }"
                        },
                        {
                            role: "user",
                            content: `Expected script: ${expectedScript}\nActual transcript: ${transcriptText}`
                        }
                    ]
                })
            });
            const groqData = await groqResponse.json();
            
            if (!groqResponse.ok) {
                throw new Error(`Groq API Error: ${groqData.error?.message || groqResponse.statusText}`);
            }
            
            const qcResultStr = groqData.choices[0].message.content;
            
            let qcResult;
            try {
                qcResult = JSON.parse(qcResultStr);
            } catch (e) {
                const match = qcResultStr.match(/\{[\s\S]*\}/);
                if(match) {
                    qcResult = JSON.parse(match[0]);
                } else {
                    throw e;
                }
            }
            
            // 6. Save to localStorage
            saveToLocalStorage(file.name, qcResult);
            
            // 5. Display results
            displayResultRow(file.name, qcResult);
            
        } catch (err) {
            console.error('Error processing file', file.name, err);
            const errResult = {
                match_score: 0,
                status: 'Error',
                summary: err.message || 'Processing failed',
                issues: []
            };
            saveToLocalStorage(file.name, errResult);
            displayResultRow(file.name, errResult);
        }
    }

    function saveToLocalStorage(filename, result) {
        let saved = JSON.parse(localStorage.getItem('voiceqc_results') || '[]');
        // Update existing or add new
        const existingIndex = saved.findIndex(r => r.filename === filename);
        const record = { filename, result, timestamp: Date.now() };
        if (existingIndex >= 0) {
            saved[existingIndex] = record;
        } else {
            saved.push(record);
        }
        localStorage.setItem('voiceqc_results', JSON.stringify(saved));
    }

    function loadPersistedResults() {
        const saved = JSON.parse(localStorage.getItem('voiceqc_results') || '[]');
        if (saved.length > 0) {
            resultsSection.style.display = 'block';
            saved.forEach(record => {
                displayResultRow(record.filename, record.result);
            });
        }
    }

    function displayResultRow(filename, result) {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        
        let badgeColor = '#EF4444'; // Red
        if (result.match_score >= 95) badgeColor = '#10B981'; // Green
        else if (result.match_score >= 80) badgeColor = '#F59E0B'; // Yellow
        
        const detailsId = `details-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        tr.innerHTML = `
            <td style="padding: 1rem;">${filename}</td>
            <td style="padding: 1rem;">
                <span style="background: ${badgeColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;">
                    ${result.match_score || 0}
                </span>
            </td>
            <td style="padding: 1rem;">${result.status || 'Unknown'}</td>
            <td style="padding: 1rem; max-width: 300px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${result.summary || 'No summary available.'}
            </td>
            <td style="padding: 1rem;">
                <button onclick="document.getElementById('${detailsId}').style.display = document.getElementById('${detailsId}').style.display === 'none' ? 'table-row' : 'none'" 
                        style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                    Expand
                </button>
            </td>
        `;
        
        const detailsTr = document.createElement('tr');
        detailsTr.id = detailsId;
        detailsTr.style.display = 'none';
        detailsTr.style.backgroundColor = 'rgba(0,0,0,0.1)';
        
        let issuesHtml = '';
        if (result.issues && result.issues.length > 0) {
            issuesHtml = '<ul style="margin: 0; padding-left: 1.5rem;">' + result.issues.map(i => 
                `<li style="margin-bottom: 0.5rem;"><strong>${i.type || 'Issue'} (${i.severity || 'Normal'}):</strong> Expected "${i.expected || ''}", found "${i.found || ''}"</li>`
            ).join('') + '</ul>';
        } else {
            issuesHtml = '<p style="margin: 0;">No issues found.</p>';
        }
        
        detailsTr.innerHTML = `
            <td colspan="5" style="padding: 1.5rem;">
                <div style="margin-bottom: 1rem;">
                    <strong>Full Summary:</strong><br/>
                    ${result.summary || 'No summary available.'}
                </div>
                <div>
                    <strong>Issues:</strong><br/>
                    ${issuesHtml}
                </div>
            </td>
        `;
        
        resultsTbody.appendChild(tr);
        resultsTbody.appendChild(detailsTr);
    }
});
