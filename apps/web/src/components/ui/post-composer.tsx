import {
  IconCalendar,
  IconGif,
  IconList,
  IconMapPin,
  IconMoodSmile,
  IconPhoto,
} from "@tabler/icons-react";
import { Avatar } from "./avatar";
import { Button } from "./button";

export function PostComposer() {
  return (
    <div className="p-4 border-b">
      <div className="flex gap-3">
        <Avatar className="flex-shrink-0 w-10 h-10">
          <div className="flex justify-center items-center w-full h-full font-semibold rounded-full bg-primary text-primary-foreground">
            H
          </div>
        </Avatar>
        <div className="flex-1">
          <textarea
            placeholder="What's happening?"
            className="w-full text-xl bg-transparent outline-none resize-none placeholder:text-muted-foreground min-h-[120px]"
          />
          <div className="flex justify-between items-center pt-3 mt-3">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full text-primary hover:bg-primary/10"
              >
                <IconPhoto className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full text-primary hover:bg-primary/10"
              >
                <IconGif className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full text-primary hover:bg-primary/10"
              >
                <IconList className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full text-primary hover:bg-primary/10"
              >
                <IconMoodSmile className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full text-primary hover:bg-primary/10"
              >
                <IconCalendar className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full text-primary hover:bg-primary/10"
              >
                <IconMapPin className="w-5 h-5" />
              </Button>
            </div>
            <Button className="px-6 font-bold rounded-full">Post</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
