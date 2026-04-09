'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download, RefreshCw, Filter, Terminal, Wifi, WifiOff, ChevronDown, X, User, Monitor, MapPin, Clock, Activity, AlertTriangle, XCircle, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import {
  listActivityLogsApi,
  getActivityStatsApi,
  getUserActivityDetailApi,
  downloadActivityLogsExport,
  getRealtimeLogsApi,
  type ActivityLog as ApiActivityLog,
  type ActivityStats,
  type UserActivityDetail,
} from '@/lib/api/activityLogs';

// ============== Types ==============
type LogLevel = 'INFO' | 'ACTION' | 'WARNING' | 'ERROR';
type FilterType = 'all' | 'login' | 'action' | 'warning' | 'error';

interface ActivityLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  action: string;
  details: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  currentPage: string;
  metadata?: Record<string, string | number>;
}

interface QuickStats {
  activeUsers: number;
  actionsToday: number;
  warnings: number;
  errors: number;
  topUsers: { name: string; actions: number }[];
}

// ============== API Data Transformers ==============
const transformApiLog = (apiLog: ApiActivityLog): ActivityLog => ({
  id: String(apiLog.activity_id),
  timestamp: new Date(apiLog.timestamp),
  level: apiLog.level,
  userId: apiLog.user_id,
  userName: apiLog.user_name || 'Unknown',
  userEmail: apiLog.user_email || '',
  userAvatar: getInitials(apiLog.user_name || 'U'),
  action: apiLog.action,
  details: apiLog.details || '',
  ipAddress: apiLog.ip_address || '',
  device: apiLog.device || 'Unknown',
  browser: apiLog.browser || 'Unknown',
  os: apiLog.os || 'Unknown',
  currentPage: apiLog.current_page || '/',
});

const transformStats = (apiStats: ActivityStats | null | undefined): QuickStats => {
  if (!apiStats) {
    return {
      activeUsers: 0,
      actionsToday: 0,
      warnings: 0,
      errors: 0,
      topUsers: [],
    };
  }
  return {
    activeUsers: apiStats.active_users ?? 0,
    actionsToday: apiStats.actions_today ?? 0,
    warnings: apiStats.warnings ?? 0,
    errors: apiStats.errors ?? 0,
    topUsers: apiStats.top_users ?? [],
  };
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
};

// ============== Helpers ==============
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
};

const getLevelColor = (level: LogLevel): string => {
  switch (level) {
    case 'INFO': return 'text-terminal-green';
    case 'ACTION': return 'text-terminal-blue';
    case 'WARNING': return 'text-terminal-yellow';
    case 'ERROR': return 'text-terminal-red';
  }
};

const getLevelBgColor = (level: LogLevel): string => {
  switch (level) {
    case 'INFO': return 'bg-terminal-green/20 border-terminal-green/50';
    case 'ACTION': return 'bg-terminal-blue/20 border-terminal-blue/50';
    case 'WARNING': return 'bg-terminal-yellow/20 border-terminal-yellow/50';
    case 'ERROR': return 'bg-terminal-red/20 border-terminal-red/50';
  }
};

// ============== Components ==============

// Header Component
const TerminalHeader: React.FC<{
  activeUsers: number;
  isLive: boolean;
  onToggleLive: () => void;
  onBack: () => void;
}> = ({ activeUsers, isLive, onToggleLive, onBack }) => (
  <div className="terminal-header flex items-center justify-between px-4 py-3 border-b border-terminal-border">
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1 px-2 py-1 rounded text-terminal-muted hover:text-terminal-green hover:bg-terminal-green/10 transition-colors font-mono text-sm"
        title="Back to Dashboard"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back</span>
      </button>
      <div className="w-px h-6 bg-terminal-border" />
      <Terminal className="w-5 h-5 text-terminal-green" />
      <h1 className="text-terminal-green font-mono text-lg font-bold tracking-wider">
        USER ACTIVITY TERMINAL <span className="text-terminal-muted">v1.0</span>
      </h1>
    </div>
    <div className="flex items-center gap-4">
      <button
        onClick={onToggleLive}
        className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-sm border transition-all ${
          isLive 
            ? 'bg-terminal-green/20 border-terminal-green/50 text-terminal-green' 
            : 'bg-terminal-muted/20 border-terminal-border text-terminal-muted'
        }`}
      >
        {isLive ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
        {isLive ? 'LIVE' : 'PAUSED'}
      </button>
      <div className="flex items-center gap-2 text-terminal-green font-mono text-sm">
        <span className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
        <span>{activeUsers} users online</span>
      </div>
    </div>
  </div>
);

// Controls Bar Component
const ControlsBar: React.FC<{
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (value: FilterType) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (value: number) => void;
  onExport: () => void;
  onRefresh: () => void;
}> = ({
  searchQuery, onSearchChange, filter, onFilterChange,
  refreshInterval, onRefreshIntervalChange, onExport, onRefresh
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false);

  const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Logs', icon: <Filter className="w-4 h-4" /> },
    { value: 'login', label: 'Login/Logout', icon: <User className="w-4 h-4" /> },
    { value: 'action', label: 'Actions', icon: <Activity className="w-4 h-4" /> },
    { value: 'warning', label: 'Warnings', icon: <AlertTriangle className="w-4 h-4" /> },
    { value: 'error', label: 'Errors', icon: <XCircle className="w-4 h-4" /> },
  ];

  const refreshOptions = [
    { value: 0, label: 'Manual' },
    { value: 5, label: '5 seconds' },
    { value: 10, label: '10 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
  ];

  return (
    <div className="controls-bar flex items-center gap-3 px-4 py-3 border-b border-terminal-border bg-terminal-bg/50">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search logs... (user, action, IP)"
          className="w-full bg-terminal-input border border-terminal-border rounded pl-10 pr-4 py-2 font-mono text-sm text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:border-terminal-green/50 focus:ring-1 focus:ring-terminal-green/30"
        />
      </div>

      {/* Filter Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className="flex items-center gap-2 px-3 py-2 bg-terminal-input border border-terminal-border rounded font-mono text-sm text-terminal-text hover:border-terminal-green/50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>{filters.find(f => f.value === filter)?.label}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {showFilterDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
            <div className="absolute top-full mt-1 left-0 z-20 w-48 bg-terminal-card border border-terminal-border rounded shadow-lg shadow-black/50">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { onFilterChange(f.value); setShowFilterDropdown(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-sm hover:bg-terminal-green/10 transition-colors ${
                    filter === f.value ? 'text-terminal-green bg-terminal-green/5' : 'text-terminal-text'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Refresh Interval Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowRefreshDropdown(!showRefreshDropdown)}
          className="flex items-center gap-2 px-3 py-2 bg-terminal-input border border-terminal-border rounded font-mono text-sm text-terminal-text hover:border-terminal-green/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{refreshOptions.find(r => r.value === refreshInterval)?.label}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {showRefreshDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowRefreshDropdown(false)} />
            <div className="absolute top-full mt-1 left-0 z-20 w-36 bg-terminal-card border border-terminal-border rounded shadow-lg shadow-black/50">
              {refreshOptions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { onRefreshIntervalChange(r.value); setShowRefreshDropdown(false); }}
                  className={`w-full text-left px-3 py-2 font-mono text-sm hover:bg-terminal-green/10 transition-colors ${
                    refreshInterval === r.value ? 'text-terminal-green bg-terminal-green/5' : 'text-terminal-text'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Manual Refresh */}
      <button
        onClick={onRefresh}
        className="p-2 bg-terminal-input border border-terminal-border rounded text-terminal-text hover:border-terminal-green/50 hover:text-terminal-green transition-colors"
        title="Refresh now"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-3 py-2 bg-terminal-green/20 border border-terminal-green/50 rounded font-mono text-sm text-terminal-green hover:bg-terminal-green/30 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>
    </div>
  );
};

// Log Entry Component
const LogEntry: React.FC<{
  log: ActivityLog;
  isSelected: boolean;
  onClick: () => void;
}> = ({ log, isSelected, onClick }) => (
  <div
    onClick={onClick}
    className={`log-entry flex items-start gap-3 px-4 py-2 font-mono text-sm cursor-pointer border-l-2 transition-all hover:bg-terminal-green/5 ${
      isSelected 
        ? 'bg-terminal-green/10 border-l-terminal-green' 
        : 'border-l-transparent hover:border-l-terminal-muted'
    }`}
  >
    <span className="text-terminal-muted shrink-0 w-20">[{formatTime(log.timestamp)}]</span>
    <span className={`shrink-0 w-20 font-bold ${getLevelColor(log.level)}`}>[{log.level}]</span>
    <span className="text-terminal-blue shrink-0 w-32 truncate" title={log.userName}>{log.userName}</span>
    <span className="text-terminal-text shrink-0 w-36">{log.action}</span>
    <span className="text-terminal-muted flex-1 truncate">{log.details}</span>
  </div>
);

// Live Log Feed Component
const LiveLogFeed: React.FC<{
  logs: ActivityLog[];
  selectedLog: ActivityLog | null;
  onSelectLog: (log: ActivityLog) => void;
  isLive: boolean;
}> = ({ logs, selectedLog, onSelectLog, isLive }) => {
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && isLive && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll, isLive]);

  const handleScroll = () => {
    if (feedRef.current) {
      setAutoScroll(feedRef.current.scrollTop === 0);
    }
  };

  return (
    <div className="log-feed flex flex-col h-full bg-terminal-bg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-terminal-card/50">
        <span className="font-mono text-xs text-terminal-muted uppercase tracking-wider">
          Live Log Feed {logs.length > 0 && `(${logs.length} entries)`}
        </span>
        <div className="flex items-center gap-2">
          {!autoScroll && (
            <button 
              onClick={() => { setAutoScroll(true); feedRef.current?.scrollTo(0, 0); }}
              className="text-xs text-terminal-yellow font-mono hover:text-terminal-green transition-colors"
            >
              ↑ Jump to latest
            </button>
          )}
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-terminal-green animate-pulse' : 'bg-terminal-muted'}`} />
        </div>
      </div>
      <div 
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-terminal"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-terminal-muted font-mono">
            <Terminal className="w-12 h-12 mb-4 opacity-30" />
            <p>No logs to display</p>
            <p className="text-xs mt-1">Waiting for activity...</p>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/30">
            {logs.map((log) => (
              <LogEntry
                key={log.id}
                log={log}
                isSelected={selectedLog?.id === log.id}
                onClick={() => onSelectLog(log)}
              />
            ))}
          </div>
        )}
      </div>
      {/* Terminal cursor effect */}
      {isLive && (
        <div className="px-4 py-2 border-t border-terminal-border bg-terminal-card/30">
          <span className="font-mono text-terminal-green text-sm">
            {'>'} <span className="animate-blink">_</span>
          </span>
        </div>
      )}
    </div>
  );
};

// User Detail Panel Component
const UserDetailPanel: React.FC<{
  log: ActivityLog | null;
  onClose: () => void;
}> = ({ log, onClose }) => {
  const [userDetail, setUserDetail] = useState<UserActivityDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!log) {
      setUserDetail(null);
      return;
    }

    const fetchUserDetail = async () => {
      setLoading(true);
      try {
        const response = await getUserActivityDetailApi(log.userId);
        console.log('User detail response:', response.data);
        if (response.success) {
          setUserDetail(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [log?.userId]);

  if (!log) {
    return (
      <div className="user-detail-panel flex flex-col items-center justify-center h-full bg-terminal-card/30 text-terminal-muted font-mono">
        <User className="w-16 h-16 mb-4 opacity-20" />
        <p>Select a log entry to view details</p>
      </div>
    );
  }

  // Get recent logs from user detail or create from current log
  const recentUserLogs: ActivityLog[] = userDetail?.recent_logs 
    ? userDetail.recent_logs.slice(0, 5).map(transformApiLog)
    : [];

  // Check if user is online from backend response
  const isOnline = userDetail?.is_online ?? false;

  return (
    <div className="user-detail-panel flex flex-col h-full bg-terminal-card/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
        <span className="font-mono text-xs text-terminal-muted uppercase tracking-wider">User Details</span>
        <button onClick={onClose} className="text-terminal-muted hover:text-terminal-text transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-terminal-green animate-spin" />
        </div>
      ) : (
        <>
          {/* User Info */}
          <div className="p-4 border-b border-terminal-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-terminal-green/20 border-2 border-terminal-green/50 flex items-center justify-center font-mono text-terminal-green text-lg font-bold">
                {log.userAvatar}
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-terminal-text font-bold">{log.userName}</h3>
                <p className="font-mono text-sm text-terminal-muted">{log.userEmail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-terminal-green' : 'bg-terminal-muted'}`} />
                  <span className={`font-mono text-xs ${isOnline ? 'text-terminal-green' : 'text-terminal-muted'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-4 border-b border-terminal-border space-y-3">
            <DetailRow icon={<User className="w-4 h-4" />} label="Role" value={userDetail?.user?.role || 'user'} />
            <DetailRow icon={<Clock className="w-4 h-4" />} label="Last Active" value={userDetail?.last_active ? getRelativeTime(new Date(userDetail.last_active)) : '-'} />
            <DetailRow icon={<Activity className="w-4 h-4" />} label="Current Page" value={userDetail?.current_page || log.currentPage || '/'} highlight />
            <DetailRow icon={<Monitor className="w-4 h-4" />} label="Device" value={`${userDetail?.browser || log.browser} - ${userDetail?.os || log.os}`} />
            <DetailRow icon={<MapPin className="w-4 h-4" />} label="IP Address" value={userDetail?.ip_address || log.ipAddress || '-'} />
          </div>

          {/* Recent Activity */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-terminal-border">
              <span className="font-mono text-xs text-terminal-muted uppercase tracking-wider">Recent Activity</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-terminal">
              {recentUserLogs.length === 0 ? (
                <div className="px-4 py-8 text-center text-terminal-muted font-mono text-sm">
                  No recent activity
                </div>
              ) : (
                recentUserLogs.map((l) => (
                  <div key={l.id} className="px-4 py-2 border-b border-terminal-border/30 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-terminal-muted">{formatTime(l.timestamp)}</span>
                      <span className={`font-bold ${getLevelColor(l.level)}`}>{l.action}</span>
                    </div>
                    <p className="text-terminal-muted mt-1 truncate">{l.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Detail Row Helper Component
const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div className="flex items-center gap-3 font-mono text-sm">
    <span className="text-terminal-muted">{icon}</span>
    <span className="text-terminal-muted w-24">{label}:</span>
    <span className={highlight ? 'text-terminal-green' : 'text-terminal-text'}>{value}</span>
  </div>
);

// Quick Stats Panel Component
const QuickStatsPanel: React.FC<{ stats: QuickStats }> = ({ stats }) => (
  <div className="quick-stats flex flex-col bg-terminal-card/30">
    <div className="px-4 py-2 border-b border-terminal-border">
      <span className="font-mono text-xs text-terminal-muted uppercase tracking-wider">Quick Stats</span>
    </div>
    
    <div className="p-4 space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox 
          icon={<User className="w-4 h-4" />}
          label="Active Users" 
          value={(stats?.activeUsers ?? 0).toString()} 
          color="green" 
        />
        <StatBox 
          icon={<Activity className="w-4 h-4" />}
          label="Actions Today" 
          value={(stats?.actionsToday ?? 0).toLocaleString()} 
          color="blue" 
        />
        <StatBox 
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Warnings" 
          value={(stats?.warnings ?? 0).toString()} 
          color="yellow" 
        />
        <StatBox 
          icon={<XCircle className="w-4 h-4" />}
          label="Errors" 
          value={(stats?.errors ?? 0).toString()} 
          color="red" 
        />
      </div>

      {/* Top Users */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-terminal-green" />
          <span className="font-mono text-xs text-terminal-muted uppercase tracking-wider">Top 5 Active Users</span>
        </div>
        <div className="space-y-1.5">
          {(stats?.topUsers ?? []).map((user, index) => (
            <div key={user.name} className="flex items-center gap-2 font-mono text-xs">
              <span className="text-terminal-muted w-4">{index + 1}.</span>
              <span className="text-terminal-text flex-1 truncate">{user.name}</span>
              <span className="text-terminal-green">{user.actions}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Stat Box Helper Component
const StatBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'blue' | 'yellow' | 'red';
}> = ({ icon, label, value, color }) => {
  const colorClasses = {
    green: 'text-terminal-green border-terminal-green/30 bg-terminal-green/10',
    blue: 'text-terminal-blue border-terminal-blue/30 bg-terminal-blue/10',
    yellow: 'text-terminal-yellow border-terminal-yellow/30 bg-terminal-yellow/10',
    red: 'text-terminal-red border-terminal-red/30 bg-terminal-red/10',
  };

  return (
    <div className={`p-3 rounded border ${colorClasses[color]} font-mono`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
};

// ============== Main Component ==============
export default function ActivityLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [stats, setStats] = useState<QuickStats>({
    activeUsers: 0,
    actionsToday: 0,
    warnings: 0,
    errors: 0,
    topUsers: [],
  });
  
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    try {
      const levelMap: Record<FilterType, string | undefined> = {
        all: undefined,
        login: undefined,
        action: 'ACTION',
        warning: 'WARNING',
        error: 'ERROR',
      };

      const response = await listActivityLogsApi({
        level: levelMap[filter],
        search: searchQuery || undefined,
        page_size: 100,
        ordering: '-created_at',
      });
      console.log('Fetched logs response:', response);

      if (response.success && response.data?.logs) {
        let transformedLogs = response.data.logs.map(transformApiLog);
        
        // Apply login filter client-side (since it's action-based, not level-based)
        if (filter === 'login') {
          transformedLogs = transformedLogs.filter(
            log => log.action.includes('LOGIN') || log.action.includes('LOGOUT')
          );
        }
        
        setLogs(transformedLogs);
        if (transformedLogs.length > 0) {
          setLastSyncTime(transformedLogs[0].timestamp.toISOString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [filter, searchQuery]);

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await getActivityStatsApi();
      if (response.success && response.data) {
        setStats(transformStats(response.data));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Keep default stats on error
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchLogs(), fetchStats()]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchLogs, fetchStats]);

  // Filter logs (client-side filtering for search)
  useEffect(() => {
    let result = logs;

    // Apply search (already done server-side, but for immediate filtering)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.userName.toLowerCase().includes(query) ||
        log.userEmail.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.ipAddress.includes(query) ||
        log.details.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(result);
  }, [logs, searchQuery]);

  // Realtime updates
  useEffect(() => {
    if (!isLive || refreshInterval === 0) return;

    const interval = setInterval(async () => {
      try {
        // Fetch new logs since latest timestamp
        const response = await getRealtimeLogsApi({
          since: lastSyncTime || undefined,
        });

        if (response.success && response.data?.new_logs && response.data.new_logs.length > 0) {
          const newLogs = response.data.new_logs.map(transformApiLog);
          setLogs(prev => [...newLogs, ...prev].slice(0, 200));
          setLastSyncTime(response.data.server_time);
        }

        if (response.success && response.data?.stats) {
          setStats(transformStats(response.data.stats));
        }
      } catch (error) {
        console.error('Failed to fetch realtime logs:', error);
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isLive, refreshInterval, lastSyncTime]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchLogs(), fetchStats()]);
    } finally {
      setLoading(false);
    }
  }, [fetchLogs, fetchStats]);

  const handleExport = useCallback(async () => {
    try {
      await downloadActivityLogsExport({
        level: filter !== 'all' && filter !== 'login' ? filter.toUpperCase() : undefined,
        format: 'csv',
      });
    } catch (error) {
      console.error('Failed to export logs:', error);
      // Fallback to client-side export
      const csv = filteredLogs.map(log => 
        `${formatDateTime(log.timestamp)},${log.level},${log.userName},${log.userEmail},${log.action},${log.details},${log.ipAddress}`
      ).join('\n');
      
      const header = 'Timestamp,Level,User,Email,Action,Details,IP\n';
      const blob = new Blob([header + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [filter, filteredLogs]);

  return (
    <div className="activity-log-page h-screen flex flex-col bg-terminal-bg font-mono overflow-hidden">
      {/* Header */}
      <TerminalHeader 
        activeUsers={stats?.activeUsers ?? 0} 
        isLive={isLive} 
        onToggleLive={() => setIsLive(!isLive)}
        onBack={() => router.push('/admin')}
      />

      {/* Controls */}
      <ControlsBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        onExport={handleExport}
        onRefresh={handleRefresh}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Log Feed (60%) */}
        <div className="w-[60%] border-r border-terminal-border">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full bg-terminal-bg">
              <Loader2 className="w-12 h-12 text-terminal-green animate-spin mb-4" />
              <p className="font-mono text-terminal-muted">Loading logs...</p>
            </div>
          ) : (
            <LiveLogFeed
              logs={filteredLogs}
              selectedLog={selectedLog}
              onSelectLog={setSelectedLog}
              isLive={isLive}
            />
          )}
        </div>

        {/* Right Side (40%) */}
        <div className="w-[40%] flex flex-col">
          {/* User Detail (60% of right) */}
          <div className="flex-6 border-b border-terminal-border overflow-hidden">
            <UserDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
          </div>
          
          {/* Quick Stats (40% of right) */}
          <div className="flex-4 overflow-hidden">
            <QuickStatsPanel stats={stats} />
          </div>
        </div>
      </div>

      {/* Scanline overlay effect (optional) */}
      <div className="pointer-events-none fixed inset-0 bg-scanline opacity-[0.03]" />
    </div>
  );
}
