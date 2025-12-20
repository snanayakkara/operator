import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRounds } from '@/contexts/RoundsContext';
import { AnalyticsTimeRange, BillingEntry, RoundsPatient } from '@/types/rounds.types';

const TIME_RANGES: { value: AnalyticsTimeRange; label: string; fullLabel: string }[] = [
  { value: '7d', label: '7d', fullLabel: '7 Days' },
  { value: '30d', label: '30d', fullLabel: '30 Days' },
  { value: '90d', label: '90d', fullLabel: '90 Days' },
  { value: '1y', label: '1y', fullLabel: '1 Year' },
  { value: 'ytd', label: 'YTD', fullLabel: 'Year to Date' },
];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

interface AnalyticsTabProps {
  className?: string;
}

interface PendingItem extends BillingEntry {
  patientId: string;
  patientName: string;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ className = '' }) => {
  const { patients, markBillingEntered } = useRounds();
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  // Helper to get date range
  const getDateRange = (range: AnalyticsTimeRange): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'ytd':
        start.setMonth(0, 1); // Jan 1st of current year
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return { start, end };
  };

  // Calculate metrics based on time range
  const metrics = useMemo(() => {
    const { start, end } = getDateRange(timeRange);
    
    // Filter patients by admission date (using createdAt as proxy)
    const allPatients = patients;
    const activePatients = allPatients.filter(p => p.status === 'active');
    const dischargedPatients = allPatients.filter(p => p.status === 'discharged');
    
    // Get all billing entries in range
    const allBillingEntries: (BillingEntry & { patientId: string })[] = [];
    allPatients.forEach(patient => {
      (patient.billingEntries || []).forEach(entry => {
        const entryDate = new Date(entry.serviceDate);
        if (entryDate >= start && entryDate <= end) {
          allBillingEntries.push({ ...entry, patientId: patient.id });
        }
      });
    });

    // Billing metrics
    const totalBillingEntries = allBillingEntries.length;
    const enteredBilling = allBillingEntries.filter(e => e.status === 'entered');
    const pendingBilling = allBillingEntries.filter(e => e.status === 'pending');
    const totalRevenue = enteredBilling.reduce((sum, e) => sum + (e.fee || 0), 0);
    const pendingRevenue = pendingBilling.reduce((sum, e) => sum + (e.fee || 0), 0);

    // Build pending items with patient info
    const pendingItems: PendingItem[] = [];
    allPatients.forEach(patient => {
      (patient.billingEntries || []).forEach(entry => {
        if (entry.status === 'pending') {
          const entryDate = new Date(entry.serviceDate);
          if (entryDate >= start && entryDate <= end) {
            pendingItems.push({
              ...entry,
              patientId: patient.id,
              patientName: patient.name,
            });
          }
        }
      });
    });
    // Sort pending items by service date (newest first)
    pendingItems.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

    // Patient metrics
    const totalPatients = allPatients.length;
    
    // Get unique MBS codes used
    const uniqueCodes = new Set(allBillingEntries.map(e => e.mbsCode));
    
    // Calculate average billing per patient
    const avgBillingPerPatient = totalPatients > 0 ? totalRevenue / totalPatients : 0;

    // Top MBS codes by frequency
    const codeFrequency: Record<string, { count: number; revenue: number; description: string }> = {};
    allBillingEntries.forEach(entry => {
      if (!codeFrequency[entry.mbsCode]) {
        codeFrequency[entry.mbsCode] = { count: 0, revenue: 0, description: entry.description };
      }
      codeFrequency[entry.mbsCode].count++;
      codeFrequency[entry.mbsCode].revenue += entry.fee || 0;
    });
    
    const topCodes = Object.entries(codeFrequency)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    // Daily breakdown for chart
    const dailyData: Record<string, { date: string; revenue: number; count: number }> = {};
    allBillingEntries.forEach(entry => {
      const date = entry.serviceDate.slice(0, 10);
      if (!dailyData[date]) {
        dailyData[date] = { date, revenue: 0, count: 0 };
      }
      dailyData[date].count++;
      if (entry.status === 'entered') {
        dailyData[date].revenue += entry.fee || 0;
      }
    });
    
    const chartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPatients,
      activePatients: activePatients.length,
      dischargedPatients: dischargedPatients.length,
      totalBillingEntries,
      enteredCount: enteredBilling.length,
      pendingCount: pendingBilling.length,
      totalRevenue,
      pendingRevenue,
      uniqueCodesCount: uniqueCodes.size,
      avgBillingPerPatient,
      topCodes,
      chartData,
      pendingItems,
    };
  }, [patients, timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAuDayMonth = (isoDate: string) =>
    new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short' }).format(new Date(isoDate));

  const formatAuDayMonthYear = (isoDate: string) =>
    new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(isoDate));

  const chartWindow = useMemo(() => metrics.chartData.slice(-14), [metrics.chartData]);
  const chartMaxRevenue = useMemo(() => Math.max(...chartWindow.map(d => d.revenue), 0), [chartWindow]);
  const chartMaxCount = useMemo(() => Math.max(...chartWindow.map(d => d.count), 0), [chartWindow]);
  const chartUsesCountScale = chartMaxRevenue <= 0 && chartMaxCount > 0;
  const chartMaxValue = chartUsesCountScale ? chartMaxCount : Math.max(chartMaxRevenue, 1);
  const chartYAxisMaxLabel = chartUsesCountScale ? `${chartMaxValue}` : formatCurrency(chartMaxValue);
  const showAllXAxisLabels = chartWindow.length > 0 && chartWindow.length <= 7;

  return (
    <div className={`h-full overflow-y-auto p-4 space-y-4 ${className}`}>
      {/* Header with time range selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">Analytics</h2>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-full">
            {TIME_RANGES.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                title={range.fullLabel}
                className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap text-center ${
                  timeRange === range.value
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          subtitle={`${metrics.enteredCount} items entered`}
          icon={DollarSign}
          color="bg-green-100 text-green-600"
        />
        <MetricCard
          title="Pending"
          value={formatCurrency(metrics.pendingRevenue)}
          subtitle={`${metrics.pendingCount} items pending`}
          icon={Clock}
          color="bg-amber-100 text-amber-600"
        />
        <MetricCard
          title="Active Patients"
          value={metrics.activePatients}
          subtitle={`${metrics.dischargedPatients} discharged`}
          icon={Users}
          color="bg-blue-100 text-blue-600"
        />
        <MetricCard
          title="Avg per Patient"
          value={formatCurrency(metrics.avgBillingPerPatient)}
          subtitle={`${metrics.uniqueCodesCount} unique codes`}
          icon={TrendingUp}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Pending Billing Action List */}
      {metrics.pendingItems.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                Pending Billing ({metrics.pendingItems.length})
              </h3>
            </div>
            <button
              onClick={async () => {
                const allIds = metrics.pendingItems.map(item => ({ patientId: item.patientId, entryId: item.id }));
                setMarkingIds(new Set(allIds.map(i => i.entryId)));
                for (const { patientId, entryId } of allIds) {
                  await markBillingEntered(patientId, entryId);
                }
                setMarkingIds(new Set());
              }}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
            >
              Mark All Entered
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.pendingItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 px-2 bg-amber-50 rounded-lg border border-amber-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-amber-700">{item.mbsCode}</span>
                    <span className="text-xs text-gray-600 truncate">{item.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{item.description}</span>
                    <span>•</span>
                    <span>{item.serviceDate.slice(0, 10)}</span>
                    <span>•</span>
                    <span className="font-medium">{formatCurrency(item.fee || 0)}</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setMarkingIds(prev => new Set([...prev, item.id]));
                    await markBillingEntered(item.patientId, item.id);
                    setMarkingIds(prev => {
                      const next = new Set(prev);
                      next.delete(item.id);
                      return next;
                    });
                  }}
                  disabled={markingIds.has(item.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {markingIds.has(item.id) ? 'Saving...' : 'Entered'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top MBS Codes */}
      {metrics.topCodes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top MBS Codes</h3>
          <div className="space-y-2">
            {metrics.topCodes.map(([code, data]) => (
              <div key={code} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium text-indigo-600">{code}</span>
                  <span className="text-xs text-gray-500 truncate max-w-[150px]">{data.description}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">{data.count}×</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Trend (Simple bar representation) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Daily Billing</h3>
          {metrics.chartData.length > 0 && (
            <span className="text-[10px] text-gray-500">
              {chartUsesCountScale ? 'Showing items' : 'Showing revenue'}
            </span>
          )}
        </div>

        {metrics.chartData.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-500">No billing entries in this range.</p>
            <p className="text-xs text-gray-400 mt-1">Add billing items to patients to see a daily trend.</p>
          </div>
        ) : (
          <>
            <div className="flex items-stretch gap-1">
              {/* Y axis */}
              <div className="w-8 flex flex-col justify-between text-[9px] text-gray-400 select-none text-right">
                <span>{chartYAxisMaxLabel}</span>
                <span>{chartUsesCountScale ? '0' : '$0'}</span>
              </div>

              {/* Bars */}
              <div className="flex-1">
                <div className="relative h-32">
                  {/* Grid lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-0 right-0 top-0 border-t border-gray-100" />
                    <div className="absolute left-0 right-0 top-1/2 border-t border-gray-100" />
                    <div className="absolute left-0 right-0 bottom-0 border-t border-gray-100" />
                  </div>

                  <div className="relative h-full flex items-end gap-1">
                    {chartWindow.map((day) => {
                      const value = chartUsesCountScale ? day.count : day.revenue;
                      const height = (value / chartMaxValue) * 100;
                      const tooltip = chartUsesCountScale
                        ? `${formatAuDayMonthYear(day.date)}: ${day.count} items (${formatCurrency(day.revenue)} entered)`
                        : `${formatAuDayMonthYear(day.date)}: ${formatCurrency(day.revenue)} (${day.count} items)`;

                      const valueLabel = chartUsesCountScale ? `${day.count}` : formatCurrency(day.revenue);

                      return (
                        <div
                          key={day.date}
                          className="flex-1 h-full flex flex-col justify-end items-center gap-1"
                          title={tooltip}
                        >
                          {/* Data label */}
                          <span className="text-[9px] text-gray-600 leading-none">
                            {value > 0 ? valueLabel : ''}
                          </span>
                          <div
                            className="w-full bg-indigo-500 rounded-t transition-colors hover:bg-indigo-600"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-axis labels below the chart */}
                <div className="flex gap-1 mt-1 ml-8">
                  {chartWindow.map((day, index) => {
                    const showXAxis = showAllXAxisLabels || index % 3 === 0;
                    return (
                      <div key={day.date} className="flex-1 text-center">
                        {showXAxis && (
                          <span className="text-[9px] text-gray-400 leading-none">
                            {formatAuDayMonth(day.date)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {chartUsesCountScale && (
              <div className="mt-2 text-[10px] text-gray-500">
                Revenue is $0 because only entered items count towards revenue; chart scales by item count.
              </div>
            )}
          </>
        )}
      </div>

      {/* Empty State */}
      {metrics.totalBillingEntries === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No billing data yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Add billing items to patients to see analytics
          </p>
        </div>
      )}

      {/* Patient Statistics Summary */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-gray-900">{metrics.totalPatients}</p>
            <p className="text-xs text-gray-500">Total Patients</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{metrics.totalBillingEntries}</p>
            <p className="text-xs text-gray-500">Billing Items</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue + metrics.pendingRevenue)}</p>
            <p className="text-xs text-gray-500">Total Value</p>
          </div>
        </div>
      </div>
    </div>
  );
};
