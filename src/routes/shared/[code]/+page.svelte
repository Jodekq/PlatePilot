<!-- src/routes/shared/[code]/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { toast } from "svelte-sonner";
  import { Toaster } from "$lib/components/ui/sonner";
  import type { Meal } from "$lib/types";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";

  type PageData = {
    meal?: Meal;
    creator?: { 
      id: string;
      username: string;
    };
    shareCode?: string;
    user: { 
      id: string;
      username: string;
    } | null;
  };

  export let data: PageData;
  
  let meal = data.meal;
  let portionsMap = {};
  let originalMealsMap = {};
  let creatorUsername = data.creator?.username || "Unknown";
  let isAuthenticated = data.user !== null;
  let isImporting = false;

  let ogDescription = "";
  
  onMount(() => {
    if (meal) {
      initializeMeal(meal);
    }
  });

  function initializeMeal(mealData: Meal) {
    if (!mealData || !mealData.id) return;
    
    const mealId = mealData.id;
    
    if (!originalMealsMap[mealId]) {
      originalMealsMap[mealId] = JSON.parse(JSON.stringify(mealData));
      portionsMap[mealId] = mealData.portions || 1;
    }
  }

  function handlePortionChange(mealId: string, newPortions: number | string) {
    newPortions = Math.max(1, parseInt(newPortions as string) || 1);
    
    portionsMap[mealId] = newPortions;
    
    if (!meal || meal.id !== mealId) return;
    
    const originalMeal = originalMealsMap[mealId];
    if (!originalMeal || !originalMeal.ingredients) return;
    
    meal.ingredients.forEach((ing, index) => {
      const originalIngredient = originalMeal.ingredients[index];
      if (originalIngredient && originalIngredient.amount) {

        const originalPortions = originalMeal.portions || 1;
        const multiplier = newPortions / originalPortions;
        
        ing.amount = parseFloat((originalIngredient.amount * multiplier).toFixed(2));
      }
    });
    
    meal = {...meal};
  }
  
  if (meal) {
    const ingredientList = meal.ingredients
      .slice(0, 3)
      .map(ing => `${ing.amount} ${ing.ingredient.unit} ${ing.ingredient.name}`)
      .join(", ");
      
    const extraIngredients = meal.ingredients.length > 3 
      ? ` and ${meal.ingredients.length - 3} more ingredients` 
      : "";
      
    ogDescription = `A recipe for ${meal.name} with ${ingredientList}${extraIngredients}. Shared by ${creatorUsername}.`;
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };
  
  async function importMeal() {
    if (!isAuthenticated) {
      toast.error("Please log in to import this meal", {
        description: "You need to be logged in to save meals to your collection."
      });
      return;
    }
    
    isImporting = true;
    
    try {
      const response = await fetch(`/api/shared/${data.shareCode}/import`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to import meal');
      }
      
      const result = await response.json();
      
      toast.success("Meal imported successfully!", {
        description: "You can now find it in your Saved Plates."
      });
      
      window.location.href = `/plates/${result.mealId}`;
      
    } catch (error) {
      toast.error("Failed to import meal", {
        description: "Please try again later."
      });
      console.error("Error importing meal:", error);
    } finally {
      isImporting = false;
    }
  }
</script>

<Toaster />

<div class="mt-4 mx-auto px-2 sm:container">
  {#if meal}
    <Card.Root class="mx-auto mb-4">
      <Card.Header class="p-2 pb-0 sm:p-6 sm:pb-0">
        <div class="flex flex-row justify-between gap-2">
          <div class="flex flex-row gap-4 items-center">
            <Card.Title class="content-center">{meal.name}</Card.Title>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger class="rounded-lg border px-3 text-sm font-medium flex items-center h-10">
                <i class='bx bx-info-circle'></i>
                <div class="hidden sm:block pl-2">Time</div>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Group>
                  <DropdownMenu.Label>Total time: {formatTime(meal.totalTime)}</DropdownMenu.Label>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item>Working time: {formatTime(meal.workingTime)}</DropdownMenu.Item>
                  <DropdownMenu.Item>Cooking time: {formatTime(meal.cookingTime)}</DropdownMenu.Item>
                  <DropdownMenu.Item>Rest time: {formatTime(meal.restTime)}</DropdownMenu.Item>
                </DropdownMenu.Group>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
          <div class="flex flex-row items-center gap-2">
            <div class="text-sm mr-0 sm:mr-4 flex items-center gap-1">
              <i class='bx bx-user'></i>
              <span>Shared by: <span class="font-medium">{creatorUsername}</span></span>
            </div>
            <Button onclick={importMeal} disabled={isImporting} variant="default" class="flex gap-1">
              <i class='bx bx-import'></i>
              <div class="hidden sm:block">{isImporting ? 'Importing...' : 'Import'}</div>
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="flex flex-col sm:flex-row gap-4">
        <div class="flex flex-col gap-2 rounded-lg border p-2 w-full sm:w-fit sm:items-start items-center z-40 bg-card">
          <div class="text-sm font-medium flex justify-center sm:justify-start">
            <div class="flex flex-row rounded-lg bg-secondary px-2 py-2 border w-fit items-center gap-1">
              <Label for={`portions-${meal.id}`}>Portions</Label>
              <Input 
                type="number" 
                id={`portions-${meal.id}`} 
                name="portions" 
                min="1" 
                value={portionsMap[meal.id] || 1}
                oninput={(e) => handlePortionChange(meal.id, parseInt(e.currentTarget.value) || 1)}
              />
            </div>
          </div>
          <div class="px-2 font-bold flex justify-center sm:justify-start">Ingredients</div>
          <div class="flex flex-col gap-2 px-2">
            {#each meal.ingredients as mealIngredient}
              <div class="flex justify-center sm:justify-start">
                {#if mealIngredient.amount}
                  {mealIngredient.amount} 
                {/if}
                {#if mealIngredient.ingredient.unit}
                  {mealIngredient.ingredient.unit} 
                {/if}
                {mealIngredient.ingredient.name}
              </div>
            {/each}
          </div>
        </div>
        <ScrollArea class="h-fit w-full overflow-auto">
          <div class="flex flex-col gap-4">
            {#each meal.steps || [] as step}
              <div class="flex flex-col sm:flex-row gap-4">
                <div class="sm:w-1/4 flex justify-center border rounded-lg p-2">
                  <div class="flex flex-col items-center">
                    <div class="w-8 h-8 flex items-center justify-center rounded-full bg-accent font-bold">
                      {step.stepNumber}
                    </div>
                    <div class="text-center text-m">{step.text}</div>
                    {#if step.extraText}
                      <div class="text-sm text-gray-500">{step.extraText}</div>
                    {/if}
                  </div>
                </div>
                <div class="sm:w-3/4 border border-dashed rounded-lg p-2">
                  <div class="flex px-2">{step.description || ''}</div>
                </div>
              </div>
            {/each}
          </div>
        </ScrollArea>
      </Card.Content>
    </Card.Root>
  {:else}
    <div class="flex flex-col items-center justify-center py-20">
      <div class="text-xl font-bold mb-4">Meal not found</div>
      <p class="text-muted-foreground mb-6">This shared meal might have expired or been removed by its creator.</p>
      <Button href="/saved_plates">Browse your saved plates</Button>
    </div>
  {/if}
</div>

<svelte:head>
  {#if meal}
  <title>{meal.name} | Plate Pilot</title>
  <meta name="description" content="A recipe for {meal.name} shared by {creatorUsername}." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content={`https://platepilot.dev/shared/${data.shareCode}`} />
  <meta property="og:title" content="{meal.name} | Plate Pilot" />
  <meta property="og:description" content="A recipe for {meal.name} shared by {creatorUsername}." />
  <meta property="og:image" content={`https://platepilot.dev/shared/${data.shareCode}`} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={`https://platepilot.dev/shared/${data.shareCode}`} />
  <meta property="twitter:title" content="{meal.name} | Plate Pilot" />
  <meta property="twitter:description" content="A recipe for {meal.name} shared by {creatorUsername}." />
  <meta property="twitter:image" content={`https://platepilot.dev/shared/${data.shareCode}`} />
  
  <meta name="theme-color" content="#22c55e" />
{/if}
</svelte:head>