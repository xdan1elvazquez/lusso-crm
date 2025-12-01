import { getAllSales } from "./salesStorage";
import { getEmployees } from "./employeesStorage";

/**
 * Calcula la nómina basada en el periodo seleccionado.
 * period: 'MONTH' | 'Q1' (1-15) | 'Q2' (16-Fin)
 */
export function calculatePayrollReport(year, month, period = 'MONTH') {
    const employees = getEmployees();
    const sales = getAllSales();
    
    // Prefijo de mes YYYY-MM
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    
    const report = employees.map(emp => {
        // Filtrar ventas del empleado en el RANGO DE FECHAS correcto
        const empSales = sales.filter(s => {
            const saleDate = s.createdAt.slice(0, 10); // YYYY-MM-DD
            
            // 1. Filtro Mes
            if (!saleDate.startsWith(targetPrefix)) return false;

            // 2. Filtro Vendedor
            const sellerName = (s.soldBy || "").toLowerCase().trim();
            const empName = (emp.name || "").toLowerCase().trim();
            if (sellerName !== empName) return false;

            // 3. Filtro Quincena (Día)
            const day = parseInt(saleDate.split('-')[2]);
            
            if (period === 'Q1' && day > 15) return false; // Solo 1 al 15
            if (period === 'Q2' && day <= 15) return false; // Solo 16 en adelante

            return true;
        });

        const totalSales = empSales.reduce((sum, s) => sum + s.total, 0);
        
        // Cálculo de Comisión
        const commissionAmount = Math.floor(totalSales * (emp.commissionPercent || 0) / 100);
        
        // Cálculo de Sueldo Base (Prorrateo)
        // Si es quincena, dividimos el mensual entre 2. Si es mes, va completo.
        const monthlySalary = Number(emp.baseSalary) || 0;
        const baseSalary = period === 'MONTH' ? monthlySalary : (monthlySalary / 2);

        return {
            id: emp.id,
            name: emp.name,
            role: emp.role,
            commissionPercent: emp.commissionPercent || 0,
            salesCount: empSales.length,
            totalSales,
            commissionAmount,
            baseSalary, 
            totalToPay: commissionAmount + baseSalary
        };
    });

    return report;
}