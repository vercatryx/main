import AnimatedLogo from "@/components/AnimatedLogo";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AnimatedLogo
            width="300px"
            height="300px"
            speed={5}
          />
          <p className="mt-6 text-muted-foreground text-lg">Loading meetings...</p>
        </div>
      </div>
    </main>
  );
}
