const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: d1, error: e1 } = await supabase.from('clientes').select('id, nombre, categorias_cliente(nombre)').limit(3);
    console.log('Result for clientes() is:', JSON.stringify(d1, null, 2), e1);
    
    const { data: d2, error: e2 } = await supabase.from('vista_metricas_clientes').select('id, nombre, categoria_id').limit(3);
    console.log('Result for vista_metricas_clientes() is:', JSON.stringify(d2, null, 2), e2);
}
test();
