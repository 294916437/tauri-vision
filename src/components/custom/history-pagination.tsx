import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useCallback } from "react";

interface HistoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limit: number;
}

export function HistoryPagination({
  currentPage,
  totalPages,
  onPageChange,
  onLimitChange,
  limit,
}: HistoryPaginationProps) {
  // 处理页码变化
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages || 1));
      if (validPage !== currentPage) {
        onPageChange(validPage);
      }
    },
    [currentPage, totalPages, onPageChange]
  );

  // 限制页码按钮的数量
  const getPageNumbers = useCallback(() => {
    if (!totalPages || totalPages <= 1) return [1];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    // 显示当前页附近的页码，总是显示第一页和最后一页
    let pages = [1];

    let startPage = Math.max(2, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);

    // 确保显示5个页码按钮（如果可能）
    if (startPage > 2) pages.push(-1); // 添加省略号

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) pages.push(-2); // 添加省略号
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className='flex items-center space-x-2'>
      <div className='hidden md:flex items-center space-x-1'>
        <Button
          variant='outline'
          size='icon'
          disabled={currentPage <= 1}
          onClick={() => goToPage(1)}
          className='h-8 w-8'>
          <ChevronsLeft className='h-4 w-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          className='h-8 w-8'>
          <ChevronLeft className='h-4 w-4' />
        </Button>
      </div>

      <div className='hidden md:flex items-center space-x-1'>
        {getPageNumbers().map((pageNum, index) => {
          if (pageNum < 0) {
            // 显示省略号
            return (
              <div key={`ellipsis-${index}`} className='px-2'>
                ...
              </div>
            );
          }

          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "outline"}
              size='icon'
              onClick={() => goToPage(pageNum)}
              className='h-8 w-8'>
              {pageNum}
            </Button>
          );
        })}
      </div>

      <div className='hidden md:flex items-center space-x-1'>
        <Button
          variant='outline'
          size='icon'
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
          className='h-8 w-8'>
          <ChevronRight className='h-4 w-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(totalPages)}
          className='h-8 w-8'>
          <ChevronsRight className='h-4 w-4' />
        </Button>
      </div>

      <div className='flex md:hidden items-center space-x-1'>
        <Button
          variant='outline'
          size='icon'
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          className='h-8 w-8'>
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <span className='text-sm px-2'>
          {currentPage} / {totalPages || 1}
        </span>
        <Button
          variant='outline'
          size='icon'
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
          className='h-8 w-8'>
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>

      <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
        <SelectTrigger className='h-8 w-[70px]'>
          <SelectValue placeholder='10' />
        </SelectTrigger>
        <SelectContent side='top'>
          <SelectItem value='10'>10</SelectItem>
          <SelectItem value='20'>20</SelectItem>
          <SelectItem value='30'>30</SelectItem>
          <SelectItem value='50'>50</SelectItem>
          <SelectItem value='100'>100</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
