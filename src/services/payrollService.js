import { getAllSales } from "./salesStorage";
import { getEmployees } from "./employeesStorage";

export function calculatePayrollReport(year, month) {
    const employees = getEmployees();
    const sales = getAllSales();
    
    // Formato de fecha para filtrar YYYY-MM
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    
    const report = employees.map(emp => {
        // Encontrar ventas del empleado en el mes
        const empSales = sales.filter(s => {
            const saleDate = s.createdAt.slice(0, 7); 
            const sellerName = (s.soldBy || "").toLowerCase().trim();
            const empName = (emp.name || "").toLowerCase().trim();
            return saleDate === targetPrefix && sellerName === empName;
        });

        const totalSales = empSales.reduce((sum, s) => sum + s.total, 0);
        const commissionAmount = Math.floor(totalSales * (emp.commissionPercent || 0) / 100);
        const baseSalary = Number(emp.baseSalary) || 0; // 👈 AHORA SÍ LEEMOS EL SUELDO

        return {
            id: emp.id,
            name: emp.name,
            role: emp.role,
            commissionPercent: emp.commissionPercent || 0,
            salesCount: empSales.length,
            totalSales,
            commissionAmount,
            baseSalary, 
            totalToPay: commissionAmount + baseSalary // 👈 TOTAL SUMADO
        };
    });

    return report;
}