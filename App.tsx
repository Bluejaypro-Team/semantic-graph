import React, { useState } from 'react';
import GraphVisualizer from './components/GraphVisualizer';
import ControlPanel from './components/ControlPanel';
import { fetchContextWithSearch, generateHierarchyGraph } from './services/geminiService';
import { GraphData, GenerationStatus } from './types';

function App() {
  const [status, setStatus] = useState<GenerationStatus>({ step: 'idle' });
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeView, setActiveView] = useState<'graph' | 'json'>('graph');

  const handleGenerate = async (topic: string) => {
    try {
      setGraphData(null);
      setStatus({ step: 'searching', message: 'Querying Google Search for latest context...' });
      setActiveView('graph');

      // Step 1: Search Grounding
      const context = await fetchContextWithSearch(topic);
      
      setStatus({ step: 'thinking', message: 'Gemini 3 Pro is analyzing relationships...' });

      // Step 2: Deep Reasoning & Structure
      const data = await generateHierarchyGraph(topic, context);
      
      setStatus({ step: 'rendering', message: 'Building graph visualization...' });
      
      // Artificial delay for smooth UX transition
      await new Promise(resolve => setTimeout(resolve, 800));

      setGraphData(data);
      setStatus({ step: 'complete', message: 'Hierarchy generated successfully.' });

    } catch (error: any) {
      console.error(error);
      setStatus({ 
        step: 'error', 
        message: error.message || 'An unexpected error occurred.' 
      });
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-200">
      {/* Left Sidebar Control Panel */}
      <ControlPanel 
        onGenerate={handleGenerate} 
        status={status} 
        graphData={graphData}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative bg-zinc-950 p-4">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="relative w-full h-full z-10 flex flex-col">
          {graphData ? (
            <div className={`w-full h-full transition-opacity duration-500 ${activeView === 'graph' ? 'opacity-100' : 'opacity-0 hidden'}`}>
                 <GraphVisualizer data={graphData} />
            </div>
          ) : (
             // Empty State
             <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4">
               <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl rotate-3">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700"></div>
               </div>
               <p className="font-medium">Enter a topic to explore its semantic structure</p>
             </div>
          )}
          
          {/* If JSON view is active but we are in desktop layout where we might want split screen in future (currently just toggles via sidebar) */}
          {/* For this simplified layout, JSON is shown in sidebar for better UX, so main area is always Graph or Empty */}
        </div>
      </main>
    </div>
  );
}

export default App;
