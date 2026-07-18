let ttsPromise = null;

function loadTts(){
  if(!ttsPromise){
    ttsPromise = (async () => {
      const module = await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js');
      return module.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype:'q8',
        device:'wasm',
        progress_callback: progress => {
          const value = Number(progress && progress.progress);
          self.postMessage({type:'progress', progress:Number.isFinite(value) ? value : null});
        }
      });
    })().catch(error => {
      ttsPromise = null;
      throw error;
    });
  }
  return ttsPromise;
}

self.addEventListener('message', async event => {
  const request = event.data || {};
  try{
    const tts = await loadTts();
    if(request.type === 'load'){
      self.postMessage({type:'result', id:request.id});
      return;
    }
    if(request.type !== 'generate') throw new Error('未対応のAI音声処理です。');
    const audio = await tts.generate(String(request.text || ''), request.options || {});
    const samples = new Float32Array(audio.audio);
    self.postMessage({
      type:'result',
      id:request.id,
      sampleRate:Number(audio.sampling_rate) || 24000,
      audio:samples.buffer
    }, [samples.buffer]);
  }catch(error){
    self.postMessage({type:'error', id:request.id, message:error && error.message ? error.message : String(error)});
  }
});
