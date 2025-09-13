// Custom chart components using SVG
export const BarChart = ({ data, width = 400, height = 200, color = '#4F46E5' }: {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  color?: string;
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width - 80) / data.length;
  const chartHeight = height - 60;

  return (
    <div className="bg-white p-4 rounded-lg">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
          <g key={i}>
            <line
              x1={60}
              y1={40 + chartHeight * percent}
              x2={width - 20}
              y2={40 + chartHeight * percent}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={55}
              y={45 + chartHeight * percent}
              fill="#6b7280"
              fontSize="12"
              textAnchor="end"
            >
              {Math.round(maxValue * (1 - percent))}
            </text>
          </g>
        ))}
        
        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const x = 60 + index * barWidth + barWidth * 0.1;
          const y = 40 + chartHeight - barHeight;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth * 0.8}
                height={barHeight}
                fill={color}
                rx={2}
                className="hover:opacity-80 transition-opacity"
              />
              <text
                x={x + (barWidth * 0.4)}
                y={height - 20}
                fill="#374151"
                fontSize="11"
                textAnchor="middle"
                className="font-medium"
              >
                {item.label.length > 8 ? item.label.substring(0, 8) + '...' : item.label}
              </text>
              <text
                x={x + (barWidth * 0.4)}
                y={y - 5}
                fill="#374151"
                fontSize="12"
                textAnchor="middle"
                className="font-semibold"
              >
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const LineChart = ({ data, width = 400, height = 200, color = '#10B981' }: {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  color?: string;
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  const chartHeight = height - 60;
  const chartWidth = width - 80;

  const points = data.map((item, index) => {
    const x = 60 + (index / (data.length - 1)) * chartWidth;
    const y = 40 + chartHeight - ((item.value - minValue) / range) * chartHeight;
    return { x, y, value: item.value, label: item.label };
  });

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="bg-white p-4 rounded-lg">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
          <g key={i}>
            <line
              x1={60}
              y1={40 + chartHeight * percent}
              x2={width - 20}
              y2={40 + chartHeight * percent}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={55}
              y={45 + chartHeight * percent}
              fill="#6b7280"
              fontSize="12"
              textAnchor="end"
            >
              {Math.round(maxValue - (range * percent))}
            </text>
          </g>
        ))}
        
        {/* Area fill */}
        <path
          d={`${pathData} L ${points[points.length - 1].x} ${40 + chartHeight} L 60 ${40 + chartHeight} Z`}
          fill={color}
          fillOpacity={0.1}
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill={color}
              className="hover:r-6 transition-all cursor-pointer"
            />
            <text
              x={point.x}
              y={height - 20}
              fill="#374151"
              fontSize="11"
              textAnchor="middle"
              className="font-medium"
            >
              {point.label.length > 6 ? point.label.substring(0, 6) + '...' : point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const PieChart = ({ data, width = 300, height = 300 }: {
  data: Array<{ label: string; value: number; color?: string }>;
  width?: number;
  height?: number;
}) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;

  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  
  let currentAngle = -90; // Start at top
  
  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    currentAngle += angle;
    
    return {
      path: pathData,
      color: item.color || colors[index % colors.length],
      label: item.label,
      value: item.value,
      percentage: percentage.toFixed(1)
    };
  });

  return (
    <div className="bg-white p-4 rounded-lg">
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={width} height={height}>
            {slices.map((slice, index) => (
              <path
                key={index}
                d={slice.path}
                fill={slice.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </svg>
        </div>
        <div className="ml-6 space-y-2">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center text-sm">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-700">
                {slice.label}: {slice.value} ({slice.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MetricCard = ({ title, value, change, icon: Icon, trend = 'up' }: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
}) => {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Icon className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}>
            {change}
          </div>
        )}
      </div>
    </div>
  );
};
