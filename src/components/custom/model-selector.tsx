import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { ModelInfo } from "@/lib/types";

interface ModelSelectorProps {
  models: ModelInfo[];
  activeModelId: string;
  onSelectModel: (modelId: string) => Promise<ModelInfo>;
  loading?: boolean;
  className?: string;
}

export function ModelSelector({
  models,
  activeModelId,
  onSelectModel,
  loading = false,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const activeModel = models.find((model) => model.id === activeModelId);

  const handleSelectModel = async (modelId: string) => {
    if (modelId === activeModelId) {
      setOpen(false);
      return;
    }

    try {
      setSelecting(true);
      await onSelectModel(modelId);
    } finally {
      setSelecting(false);
      setOpen(false);
    }
  };

  if (loading) {
    return <Skeleton className={cn("h-9 w-[200px]", className)} />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
          disabled={selecting}>
          {activeModel ? activeModel.name : "选择模型..."}
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0' align='start'>
        <Command>
          <CommandInput placeholder='搜索模型...' />
          <CommandEmpty>未找到匹配的模型</CommandEmpty>
          <CommandGroup heading='可用模型'>
            {models.map((model) => (
              <CommandItem
                key={model.id}
                value={model.name}
                onSelect={() => handleSelectModel(model.id)}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    model.id === activeModelId ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className='flex flex-col'>
                  <span>{model.name}</span>
                  <span className='text-xs text-muted-foreground'>
                    {model.model_type} · {model.num_classes}类
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
