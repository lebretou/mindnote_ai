// Placeholder for notes view logic

document.addEventListener('DOMContentLoaded', () => {
    console.log('Notes View page loaded.');

    const markdownContentDiv = document.getElementById('markdown-content');
    const sourceListUl = document.getElementById('source-list');
    const downloadButton = document.getElementById('download-button');
    const roadmapFlowchartDiv = document.getElementById('roadmap-flowchart'); // Get flowchart container

    let generatedMarkdown = ''; // To store the markdown for download

    // 1. Retrieve notes and sources from chrome.storage
    chrome.storage.local.get(['generatedNotes', 'recordedSources'], async (result) => { // Make callback async
        if (chrome.runtime.lastError) {
            console.error("Error retrieving data from storage:", chrome.runtime.lastError);
            markdownContentDiv.innerHTML = '<p>Error loading notes. Please try generating them again.</p>';
            roadmapFlowchartDiv.innerHTML = '<p>Error loading roadmap.</p>'; // Show error in flowchart area too
            return;
        }

        generatedMarkdown = result.generatedNotes || '';
        const sources = result.recordedSources || [];

        console.log("Retrieved Notes:", generatedMarkdown);
        console.log("Retrieved Sources for Roadmap:", sources);

        // --- Render Markdown Notes (Existing Logic) ---
        if (!generatedMarkdown) {
            markdownContentDiv.innerHTML = '<p>No summary notes found. Please generate notes first.</p>';
        } else if (typeof marked !== 'undefined') {
            try {
                markdownContentDiv.innerHTML = marked.parse(generatedMarkdown);
                console.log('Markdown successfully rendered');
            } catch (error) {
                console.error('Error rendering markdown:', error);
                renderFallbackMarkdown();
            }
        } else {
            console.warn('marked.js library not found. Displaying raw markdown.');
            renderFallbackMarkdown();
        }

        function renderFallbackMarkdown() {
            markdownContentDiv.innerHTML = '';
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = generatedMarkdown;
            pre.appendChild(code);
            markdownContentDiv.appendChild(pre);
        }
        // --- End Markdown Rendering ---

        // --- Render Exploration Roadmap Flowchart ---
        if (sources.length > 0) {
            try {
                // Generate Mermaid definition
                let mermaidDefinition = 'graph LR;\n'; // Left-to-Right graph
                sources.forEach((source, index) => {
                    // Sanitize title for Mermaid ID and label
                    const nodeId = `node${index}`; // Simple unique ID
                    // Escape characters that might break Mermaid syntax within the label
                    const nodeLabel = source.title ? source.title.replace(/[\"`]/g, '') : `Source ${index + 1}`;
                    const nodeUrl = source.url;
                    
                    // Define the node with title and link
                    mermaidDefinition += `    ${nodeId}["${nodeLabel}"];\n`;
                    // Add click interaction to open the URL
                    mermaidDefinition += `    click ${nodeId} "${nodeUrl}" "_blank";\n`; 

                    // Add edge from previous node
                    if (index > 0) {
                        const prevNodeId = `node${index - 1}`;
                        mermaidDefinition += `    ${prevNodeId} --> ${nodeId};\n`;
                    }
                });

                console.log("Generated Mermaid Definition:\n", mermaidDefinition);

                // Render with Mermaid.js
                const { svg } = await mermaid.render('roadmap-graph', mermaidDefinition);
                roadmapFlowchartDiv.innerHTML = svg;
                console.log('Roadmap flowchart successfully rendered');

            } catch (error) {
                console.error('Error rendering flowchart:', error);
                roadmapFlowchartDiv.innerHTML = `<p>Error rendering flowchart: ${error.message}</p>`;
            }
        } else {
            roadmapFlowchartDiv.innerHTML = '<p>No sources recorded for roadmap.</p>';
        }
        // --- End Flowchart Rendering ---


        // --- Populate Source List (Existing Logic - could be enhanced or removed later) ---
        sourceListUl.innerHTML = ''; // Clear existing list
        if (sources.length > 0) {
            sources.forEach((source, index) => {
                if (source && source.url) {
                    const li = document.createElement('li');
                    li.dataset.sourceId = source.url; 
                    li.title = source.url; 

                    const img = document.createElement('img');
                    img.classList.add('source-thumbnail');
                    if (source.screenshot) {
                        img.src = source.screenshot; 
                        img.alt = `Thumbnail for ${source.url}`;
                    } else {
                        img.alt = 'No thumbnail available';
                    }
                    li.appendChild(img);

                    const urlSpan = document.createElement('span');
                    urlSpan.classList.add('source-url');
                    // Make the text clickable as well
                    const link = document.createElement('a');
                    link.href = source.url;
                    link.textContent = source.title || source.url; // Use title if available
                    link.target = "_blank";
                    urlSpan.appendChild(link); 
                    li.appendChild(urlSpan);
                    
                    sourceListUl.appendChild(li);
                } else {
                    console.warn("Source item missing URL:", source);
                }
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No sources recorded.';
            sourceListUl.appendChild(li);
        }
        // --- End Source List Population ---

        // --- Download Button (Existing Logic) ---
        downloadButton.addEventListener('click', () => {
            if (!generatedMarkdown) {
                alert('No markdown content to download.');
                return;
            }
            const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mindnote_notes.md'; 
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a); 
            URL.revokeObjectURL(url); 
        });
        // --- End Download Button ---

        // TODO: Remove old hover/line drawing TODO if flowchart replaces it
        // 5. TODO: Implement hover effect and line drawing 

    });
}); 