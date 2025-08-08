
import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ANALYZE_URL = 'https://n8n.artificialartz.xyz/webhook/analyze'
const DEFAULT_MODE: 'mock' | 'cloud' = 'cloud'

type BpSide = 'OG'|'OO'|'CG'|'CO'
type AnalyzeRequest = {
  sessionId: string
  motion: string
  side: BpSide
  durationSec: number
  gcsUri?: string
  audioBlobUrl?: string
  uid?: string
}
type AnalyzeResponse = {
  status: 'scored'|'failed'|'queued'
  sessionId: string
  transcript: string
  scores: { matter: number; manner: number; method: number; total: number }
  delivery: { wpm: number; fillerPerMin: number }
  timing: { status: 'ok'|'undertime'|'overtime'; notes?: string }
  feedback: {
    justification: { matter: string[]; manner: string[]; method: string[] }
    actionables: { title: string; why: string; how: string }[]
    drills: { name: string; instructions: string }[]
  }
  rubricVersion: string
}

async function mockAnalyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  await new Promise(r=>setTimeout(r,800))
  const transcript = 'Thank you, chair. Our bench advances two arguments on harm reduction and democratic accountability...'
  const matter = 24 + Math.floor(Math.random()*10)
  const manner = 22 + Math.floor(Math.random()*10)
  const method = 12 + Math.floor(Math.random()*8)
  const total = matter + manner + method
  const wpm = Math.round(120 + Math.random()*80)
  const fillerPerMin = +(Math.random()*2).toFixed(2)
  const timingStatus = req.durationSec < 390 ? 'undertime' : req.durationSec > 435 ? 'overtime' : 'ok'
  return {
    status: 'scored',
    sessionId: req.sessionId,
    transcript,
    scores: { matter, manner, method, total },
    delivery: { wpm, fillerPerMin },
    timing: { status: timingStatus },
    feedback: {
      justification: {
        matter: ['Clear claim structure', 'Could deepen comparative weighing'],
        manner: ['Good clarity', 'Signposting can be sharper'],
        method: ['Role mostly fulfilled', 'Timing close to limit'],
      },
      actionables: [
        { title: 'Sharper signposting', why: 'Judge navigation', how: 'Label arguments & subpoints (A/B/C)' },
        { title: 'Frontload clash', why: 'Directly engage opp', how: 'Open with strongest refutation then rebuild' },
      ],
      drills: [
        { name: '60s signpost drill', instructions: 'Open with roadmap; label arguments and subpoints clearly.' },
        { name: 'Rebuttal ladder', instructions: 'Write 3 attacks escalating in strength on the same claim.' },
      ],
    },
    rubricVersion: 'bp_v1.3',
  }
}

async function cloudAnalyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const r = await fetch(ANALYZE_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      sessionId: req.sessionId,
      motion: req.motion,
      side: req.side,
      durationSec: req.durationSec,
      gcsUri: req.gcsUri || '',
      uid: req.uid || 'demo-user',
    })
  })
  if (!r.ok) throw new Error('Cloud analyze failed: ' + r.status)
  const data = await r.json()
  if (!data.scores && data.matter !== undefined) {
    data.scores = { matter: data.matter, manner: data.manner, method: data.method, total: data.total }
  }
  return data as AnalyzeResponse
}

function useAnalysisAdapter() {
  const [mode, setMode] = useState<'mock'|'cloud'>(DEFAULT_MODE)
  const analyze = async (req: AnalyzeRequest) => {
    try {
      if (mode === 'cloud') return await cloudAnalyze(req)
      return await mockAnalyze(req)
    } catch (e) {
      console.warn(e)
      return await mockAnalyze(req)
    }
  }
  return { mode, setMode, analyze }
}

const Chip: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span className='inline-block bg-white/70 border border-white/60 rounded-full px-3 py-1'>{children}</span>
)

const Meter: React.FC<{label: string; value: number; max: number}> = ({label, value, max}) => {
  const pct = Math.max(0, Math.min(100, Math.round((value/max)*100)))
  return (
    <div>
      <div className='flex justify-between text-sm mb-1'><span>{label}</span><span>{value}/{max}</span></div>
      <div className='h-2 bg-white/40 rounded-full overflow-hidden'>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className='h-2 rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-amber-500'
        />
      </div>
    </div>
  )
}

type Screen = 'dashboard'|'practice'|'session'

export default function App(){
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [sessionId, setSessionId] = useState('')
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const { mode, setMode } = useAnalysisAdapter()

  return (
    <div className='min-h-screen relative overflow-hidden text-gray-900'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute -top-40 -left-40 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-30 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 animate-pulse'/>
        <div className='absolute -bottom-40 -right-40 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-30 bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 animate-[pulse_6s_ease-in-out_infinite]'/>
      </div>

      <header className='p-4 sticky top-0 bg-white/60 backdrop-blur border-b border-white/40 z-10'>
        <div className='max-w-5xl mx-auto flex items-center justify-between'>
          <div className='font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-amber-500'>DebateMaster BP</div>
          <nav className='flex items-center gap-2'>
            <HeaderTab active={screen==='dashboard'} onClick={()=>setScreen('dashboard')}>Dashboard</HeaderTab>
            <HeaderTab active={screen==='practice'} onClick={()=>setScreen('practice')}>Practice</HeaderTab>
            <HeaderTab active={screen==='session'} onClick={()=>setScreen('session')}>Session</HeaderTab>
            <div className='ml-3 text-xs flex items-center gap-2'>
              <span className='px-2 py-1 rounded-full bg-black/80 text-white'>{mode.toUpperCase()}</span>
              <button className='px-3 py-1 rounded-xl hover:bg-white/30' onClick={()=> setMode(mode==='cloud'?'mock':'cloud')}>Toggle</button>
          </div>
          </nav>
        </div>
      </header>

      <main className='relative max-w-5xl mx-auto p-4'>
        <AnimatePresence mode='wait'>
          {screen==='dashboard' && (
            <motion.div key='dash' initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Dashboard onStart={()=>setScreen('practice')} />
            </motion.div>
          )}
          {screen==='practice' && (
            <motion.div key='practice' initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Practice onAnalyzed={(sid, resp)=>{ setSessionId(sid); setAnalysis(resp); setScreen('session') }} />
            </motion.div>
          )}
          {screen==='session' && (
            <motion.div key='session' initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Session sessionId={sessionId} analysis={analysis} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function HeaderTab({active, onClick, children}:{active:boolean; onClick:()=>void; children:React.ReactNode}){
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-xl text-sm transition relative ${active? 'text-black' : 'text-gray-600 hover:text-black'}`}>
      <span>{children}</span>
      {active && (<motion.span layoutId='tab-underline' className='absolute left-0 right-0 -bottom-1 h-[3px] rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-amber-500' />)}
    </button>
  )
}

function Dashboard({ onStart }:{ onStart:()=>void }){
  return (
    <div className='grid md:grid-cols-2 gap-4'>
      <Card>
        <h2 className='text-xl font-semibold mb-2'>Welcome back 👋</h2>
        <p className='text-sm text-gray-700 mb-4'>Practice a BP speech, get rubric-based feedback (Matter/Manner/Method), and actionable drills.</p>
        <Primary onClick={onStart}>Start Practice</Primary>
      </Card>
      <Card>
        <h3 className='font-semibold mb-2'>Learning Path</h3>
        <ul className='list-disc pl-5 text-sm text-gray-800 space-y-1'>
          <li>Foundation: Roles, Structure, Timing</li>
          <li>Technique: Signposting, Clash, Weighing</li>
          <li>Advanced: Extensions, Framing, Comparative</li>
        </ul>
      </Card>
    </div>
  )
}

function Practice({ onAnalyzed }:{ onAnalyzed:(sid:string,resp:AnalyzeResponse)=>void }){
  const { analyze } = useAnalysisAdapter()
  const [motionTxt, setMotionTxt] = useState('This House would ban targeted political advertising on social media.')
  const [side, setSide] = useState<BpSide>('OG')
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const start = ()=>{ setIsRecording(true); setSeconds(0); timerRef.current = window.setInterval(()=>setSeconds(s=>s+1),1000) }
  const stop  = ()=>{ setIsRecording(false); if(timerRef.current) window.clearInterval(timerRef.current); timerRef.current = null }
  useEffect(()=>()=>{ if(timerRef.current) window.clearInterval(timerRef.current) }, [])

  const onAnalyzeClick = async()=>{
    setLoading(TrueFalse(true)); setError('')
    try{
      const sid = 'sess_' + Math.random().toString(36).slice(2,8)
      const req: AnalyzeRequest = { sessionId: sid, motion: motionTxt, side, durationSec: seconds || 420, uid:'demo-user' }
      const resp = await analyze(req)
      onAnalyzed(sid, resp)
    }catch(e:any){ setError(e?.message || 'Analyze failed') }
    finally{ setLoading(FalseTrue(false)) }
  }

  const mins = Math.floor(seconds/60), secs = seconds%60, pretty = `${mins}:${secs.toString().padStart(2,'0')}`

  return (
    <div className='grid lg:grid-cols-3 gap-4'>
      <Card className='lg:col-span-2'>
        <h2 className='text-lg font-semibold mb-3'>Practice Setup</h2>
        <label className='block text-sm font-medium mb-1'>Motion</label>
        <textarea className='w-full border rounded-xl p-3 mb-3 bg-white/70' rows={3} value={motionTxt} onChange={e=>setMotionTxt(e.target.value)} />
        <label className='block text-sm font-medium mb-1'>Side</label>
        <select className='border rounded-xl p-2 mb-3 bg-white/70' value={side} onChange={e=>setSide(e.target.value as BpSide)}>
          <option>OG</option><option>OO</option><option>CG</option><option>CO</option>
        </select>

        <div className='flex items-center gap-3 mt-2'>
          <Primary onClick={start} disabled={isRecording}>Record</Primary>
          <Danger onClick={stop} disabled={!isRecording}>Stop</Danger>
          <div className='text-sm text-gray-700'>Timer: <span className='font-mono'>{pretty}</span> (target 7:00)</div>
        </div>

        <div className='mt-4 flex items-center gap-3'>
          <Primary onClick={onAnalyzeClick} disabled={loading}>{loading? 'Analyzing…' : 'Analyze Speech (Cloud→Mock fallback)'}</Primary>
          {error && <span className='text-sm text-red-600'>{error}</span>}
        </div>
      </Card>
      <Card>
        <h3 className='font-semibold mb-2'>Tips</h3>
        <ul className='list-disc pl-5 text-sm text-gray-800 space-y-1'>
          <li>Roadmap first: label arguments A/B/C.</li>
          <li>Frontload clash: hit their strongest point early.</li>
          <li>Weigh: magnitude × probability × reversibility.</li>
        </ul>
      </Card>
    </div>
  )
}

function Session({ sessionId, analysis }:{ sessionId:string; analysis:AnalyzeResponse|null }){
  if(!analysis){
    return <Card><h2 className='text-lg font-semibold'>No session yet</h2><p className='text-sm text-gray-700'>Run an analysis from the Practice tab.</p></Card>
  }
  const { transcript, scores, feedback, delivery, timing, rubricVersion } = analysis
  return (
    <div className='grid lg:grid-cols-3 gap-4'>
      <Card className='lg:col-span-2'>
        <div className='flex items-center justify-between mb-2'>
          <h2 className='text-lg font-semibold'>Session: {sessionId}</h2>
          <span className='text-xs text-gray-600'>Rubric {rubricVersion}</span>
        </div>
        <div className='grid md:grid-cols-3 gap-3 mb-4'>
          <Meter label='Matter' value={scores.matter} max={40} />
          <Meter label='Manner' value={scores.manner} max={40} />
          <Meter label='Method' value={scores.method} max={20} />
        </div>
        <div className='mb-3 text-sm flex flex-wrap gap-2'>
          <Chip>Total: <b>{scores.total}</b></Chip>
          <Chip>WPM: <b>{delivery.wpm}</b></Chip>
          <Chip>Filler/min: <b>{delivery.fillerPerMin}</b></Chip>
          <Chip>Timing: <b>{timing.status}</b></Chip>
        </div>
        <div className='border rounded-xl p-3 bg-white/70'>
          <h3 className='font-semibold mb-2'>Transcript</h3>
          <p className='whitespace-pre-wrap text-sm text-gray-900'>{transcript}</p>
        </div>
      </Card>

      <Card>
        <h3 className='font-semibold mb-2'>Justification</h3>
        <SectionList title='Matter' items={feedback.justification.matter} />
        <SectionList title='Manner' items={feedback.justification.manner} />
        <SectionList title='Method' items={feedback.justification.method} />
      </Card>

      <Card className='lg:col-span-3'>
        <div className='grid md:grid-cols-2 gap-4'>
          <div>
            <h3 className='font-semibold mb-2'>Actionables</h3>
            <ul className='space-y-2 text-sm'>
              {feedback.actionables.map((a,i)=>(
                <li key={i} className='border rounded-xl p-3 bg-white/70'>
                  <div className='font-medium'>{a.title}</div>
                  <div className='text-gray-800'><b>Why:</b> {a.why}</div>
                  <div className='text-gray-800'><b>How:</b> {a.**how**}</div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className='font-semibold mb-2'>Drills</h3>
            <ul className='space-y-2 text-sm'>
              {feedback.drills.map((d,i)=>(
                <li key={i} className='border rounded-xl p-3 bg-white/70'>
                  <div className='font-medium'>{d.name}</div>
                  <div className='text-gray-800'>{d.instructions}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

const Card: React.FC<{className?:string; children:React.ReactNode}> = ({className='', children}) => (
  <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{duration:0.25}} className={'rounded-2xl border border-white/60 shadow-xl bg-white/60 backdrop-blur p-5 ' + className}>{children}</motion.div>
)
const Primary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({className='', children, ...rest}) => (
  <button {...rest} className={'px-4 py-2 rounded-xl transition disabled:opacity-50 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-amber-500 text-white hover:opacity-90 '+className}>{children}</button>
)
const Danger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({className='', children, ...rest}) => (
  <button {...rest} className={'px-4 py-2 rounded-xl transition disabled:opacity-50 bg-gradient-to-r from-rose-600 to-red-600 text-white hover:opacity-90 '+className}>{children}</button>
)

function SectionList({ title, items }:{ title:string; items:string[] }){
  return (
    <div className='mb-3'>
      <div className='text-sm font-semibold mb-1'>{title}</div>
      <ul className='list-disc pl-5 text-sm text-gray-800 space-y-1'>
        {items.map((x,i)=>(<li key={i}>{x}</li>))}
      </ul>
    </div>
  )
}

// tiny helpers to avoid inline eslint warnings in minified preview above
const TrueFalse = (v:boolean)=>v
const FalseTrue = (v:boolean)=>v
