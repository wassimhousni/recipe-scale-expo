/**
 * Mock OCR service that simulates processing a recipe image.
 * Returns fake "Chocolate Cake" recipe text after a 1-second delay.
 */
export async function ocrImage(base64: string): Promise<string> {
  // Simulate network/processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return fake recipe text
  return `Chocolate Cake

Ingredients:
- 2 cups all-purpose flour
- 2 cups sugar
- 3/4 cup unsweetened cocoa powder
- 2 teaspoons baking soda
- 1 teaspoon baking powder
- 1 teaspoon salt
- 2 eggs
- 1 cup buttermilk
- 1 cup hot water
- 1/2 cup vegetable oil
- 2 teaspoons vanilla extract

Instructions:
1. Preheat oven to 350°F (175°C). Grease and flour two 9-inch round cake pans.
2. In a large bowl, combine flour, sugar, cocoa, baking soda, baking powder, and salt.
3. Add eggs, buttermilk, oil, and vanilla. Beat on medium speed for 2 minutes.
4. Stir in hot water (batter will be thin).
5. Pour into prepared pans.
6. Bake 30-35 minutes or until a toothpick inserted in center comes out clean.
7. Cool 10 minutes; remove from pans to wire racks. Cool completely before frosting.`;
}
