interface SimpleBarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  title?: string;
  className?: string;
}

export function SimpleBarChart({ data, title, className = '' }: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <div className={`p-4 ${className}`}>
      {title && (
        <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
      )}
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-20 text-sm text-gray-600 truncate">{item.label}</div>
            <div className="flex-1">
              <div className="bg-gray-200 rounded-full h-4 relative overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.color || 'bg-blue-500'
                  }`}
                  style={{ 
                    width: `${(item.value / maxValue) * 100}%`,
                    minWidth: item.value > 0 ? '2px' : '0'
                  }}
                />
              </div>
            </div>
            <div className="w-16 text-sm text-gray-900 text-right font-medium">
              {typeof item.value === 'number' && item.value % 1 === 0 
                ? item.value 
                : item.value.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SimpleLineChartProps {
  data: Array<{ label: string; value: number }>;
  title?: string;
  className?: string;
  color?: string;
}

export function SimpleLineChart({ data, title, className = '', color = 'blue' }: SimpleLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const range = maxValue - minValue;

  return (
    <div className={`p-4 ${className}`}>
      {title && (
        <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
      )}
      <div className="relative h-32 bg-gray-50 rounded-lg p-2">
        <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={`rgb(${color === 'blue' ? '59 130 246' : color === 'green' ? '34 197 94' : '168 85 247'})`}
            strokeWidth="2"
            points={data.map((item, index) => {
              const x = (index / (data.length - 1)) * 400;
              const y = range > 0 ? ((maxValue - item.value) / range) * 80 + 10 : 50;
              return `${x},${y}`;
            }).join(' ')}
          />
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 400;
            const y = range > 0 ? ((maxValue - item.value) / range) * 80 + 10 : 50;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={`rgb(${color === 'blue' ? '59 130 246' : color === 'green' ? '34 197 94' : '168 85 247'})`}
              />
            );
          })}
        </svg>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          {data.map((item, index) => (
            <span key={index} className="truncate" style={{ maxWidth: `${100 / data.length}%` }}>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  color?: string;
}

export function MetricCard({ title, value, change, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    indigo: 'text-indigo-600 bg-indigo-100',
    orange: 'text-orange-600 bg-orange-100'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${
                change.positive !== false ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.positive !== false ? '+' : ''}{change.value}%
              </span>
              <span className="text-sm text-gray-500 ml-1">{change.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
