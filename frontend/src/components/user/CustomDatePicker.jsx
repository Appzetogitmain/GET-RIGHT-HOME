import React, { useState, useRef, useEffect } from 'react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addDays, 
    isBefore, 
    isAfter, 
    startOfDay 
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';

const CustomDatePicker = ({ selectedDate, onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const today = startOfDay(new Date());
    const maxDate = addDays(today, 56); // 8 weeks

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    
    const onDateClick = (day) => {
        if (!isBefore(day, today) && !isAfter(day, maxDate)) {
            // Format to YYYY-MM-DD for consistency
            onChange(format(day, 'yyyy-MM-dd'));
            setIsOpen(false);
        }
    };

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center py-2 px-4 border-b border-gray-200">
                <button 
                    onClick={prevMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                >
                    <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <div className="font-semibold text-sm text-gray-800">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <button 
                    onClick={nextMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                >
                    <ChevronRight size={16} className="text-gray-600" />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const dateFormat = "eeeeEE";
        const days = [];
        let startDate = startOfWeek(currentMonth);

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center font-medium text-[11px] text-gray-800 py-2 border-r border-b border-gray-200 last:border-r-0">
                    {format(addDays(startDate, i), dateFormat).substring(0, 2)}
                </div>
            );
        }
        return <div className="grid grid-cols-7 bg-white">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd');
                const cloneDay = day;
                const isSelected = selectedDate && isSameDay(day, new Date(selectedDate));
                const isDisabled = isBefore(day, today) || isAfter(day, maxDate);
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <div
                        key={day}
                        onClick={() => !isDisabled && onDateClick(cloneDay)}
                        className={`flex items-center justify-center h-10 border-r border-b border-gray-200 last:border-r-0 text-sm font-medium transition-colors
                            ${!isCurrentMonth ? 'text-gray-300 bg-gray-50/50' : ''}
                            ${isDisabled ? 'text-gray-300 cursor-not-allowed bg-gray-50/50' : 'cursor-pointer hover:bg-gray-100 text-gray-600'}
                            ${isSelected && !isDisabled ? 'bg-[#2b86cc] text-white hover:bg-[#2b86cc]' : ''}
                        `}
                    >
                        {formattedDate}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    return (
        <div className="relative flex-1 w-full" ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex-1 flex items-center cursor-pointer w-full bg-transparent"
            >
                <input
                    type="text"
                    readOnly
                    placeholder="Shifting Date"
                    value={selectedDate ? format(new Date(selectedDate), 'dd MMM yyyy') : ''}
                    className="flex-1 outline-none text-sm font-semibold text-gray-700 bg-transparent cursor-pointer w-full"
                />
            </div>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden w-[280px]">
                    {/* Header Banner */}
                    <div className="bg-[#e4e4e4] text-center py-2 px-3 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-800">You can only book 8 weeks prior</span>
                    </div>
                    
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;
