import { MOCK_SITUATION_STATS } from '@/data/mockData';
import { AlertCircle, AlertTriangle, ShieldCheck, CheckCircle2, TrendingUp, Info } from 'lucide-react';

export default function Stats() {
  const getIcon = (color: string) => {
    switch (color) {
      case 'red':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'orange':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'blue':
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
      case 'emerald':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBorderColor = (color: string) => {
    switch (color) {
      case 'red':
        return 'border-red-200 bg-red-50 hover:border-red-300 shadow-sm';
      case 'orange':
        return 'border-orange-200 bg-orange-50 hover:border-orange-300 shadow-sm';
      case 'blue':
        return 'border-blue-200 bg-blue-50 hover:border-blue-300 shadow-sm';
      case 'emerald':
        return 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 shadow-sm';
      default:
        return 'border-slate-200 bg-white shadow-sm';
    }
  };

  return (
    <section className="bg-white py-12 border-b border-slate-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
                Live Situation Statistics
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              National Crisis Center Monitoring Feed (Mock Data Schema)
            </p>
          </div>
          <div className="mt-3 md:mt-0 flex items-center space-x-2 text-[11px] font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Ready for REST API Endpoint: GET /api/incidents/stats</span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_SITUATION_STATS.map((stat) => (
            <div
              key={stat.id}
              className={`group p-6 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${getBorderColor(
                stat.color
              )}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  {stat.label}
                </span>
                <div className="p-2 rounded-lg bg-white border border-slate-200 transition-transform duration-200 group-hover:scale-110">
                  {getIcon(stat.color)}
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
                  {stat.value}
                </span>
                {stat.change && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-slate-500 inline" />
                    <span>{stat.change}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>


      </div>
    </section>
  );
}
