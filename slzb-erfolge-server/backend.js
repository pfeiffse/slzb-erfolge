
// SLZB-Erfolge v3 - Supabase-Anbindung
const Backend = {
  client: null,
  async init() {
    const cfg = window.SLZB_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || cfg.supabaseUrl.includes('YOUR_PROJECT')) {
      throw new Error('config.js fehlt oder ist noch nicht konfiguriert.');
    }
    this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  },
  async session() { return (await this.client.auth.getSession()).data.session; },
  async requireOk(promise, label='Backend') {
    const {data,error} = await promise;
    if (error) throw new Error(`${label}: ${error.message}`);
    return data;
  },
  async invoke(name, body) {
    const {data,error}=await this.client.functions.invoke(name,{body});
    if(error) throw new Error(error.message);
    return data;
  }
};
