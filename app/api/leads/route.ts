
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarLeads } from '@/lib/oracle-leads-service';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      console.log('❌ Cookie de usuário não encontrado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    console.log('🍪 Cookie do usuário parseado:', user);

    const isAdmin = user.role === "Administrador" || 
                    user.role === "Admin" || 
                    user.role === "admin" ||
                    user.role === "ADMINISTRADOR";
    
    const idEmpresa = user.ID_EMPRESA;
    const codUsuario = parseInt(user.id) || user.id;
    
    console.log('👤 Usuário autenticado:', user.name, '(ID:', codUsuario, ', Role:', user.role, ', Admin:', isAdmin, ')');

    // Buscar leads direto do Oracle
    const leads = await consultarLeads(idEmpresa, codUsuario, isAdmin);
    console.log(`✅ API - ${leads.length} leads retornados do Oracle`);

    return NextResponse.json(leads, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar leads:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar leads' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
