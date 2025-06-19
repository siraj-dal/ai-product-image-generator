// Define the product type interface
export interface ProductType {
  id: string
  name: string
  description: string
  icon: string // Lucide icon name
  defaultBackgroundType: "studio" | "lifestyle"
}

// Define the prompt template interface
export interface PromptTemplate {
  id: string
  productTypeId: string
  name: string
  template: string
  negativePrompt?: string
  description?: string
  isDefault?: boolean
}

// Define common product types
export const productTypes: ProductType[] = [
  {
    id: "clothing",
    name: "Clothing",
    description: "Shirts, dresses, pants, jackets, and other apparel",
    icon: "shirt",
    defaultBackgroundType: "studio",
  },
  {
    id: "footwear",
    name: "Footwear",
    description: "Shoes, boots, sneakers, and other footwear",
    icon: "boot",
    defaultBackgroundType: "studio",
  },
  {
    id: "accessories",
    name: "Accessories",
    description: "Jewelry, watches, bags, and other accessories",
    icon: "watch",
    defaultBackgroundType: "studio",
  },
  {
    id: "electronics",
    name: "Electronics",
    description: "Phones, laptops, cameras, and other electronic devices",
    icon: "smartphone",
    defaultBackgroundType: "studio",
  },
  {
    id: "home",
    name: "Home Goods",
    description: "Furniture, decor, kitchenware, and other home items",
    icon: "sofa",
    defaultBackgroundType: "lifestyle",
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Makeup, skincare, haircare, and other beauty products",
    icon: "sparkles",
    defaultBackgroundType: "lifestyle",
  },
  {
    id: "sports",
    name: "Sports & Fitness",
    description: "Exercise equipment, sportswear, and fitness accessories",
    icon: "dumbbell",
    defaultBackgroundType: "lifestyle",
  },
  {
    id: "toys",
    name: "Toys & Games",
    description: "Toys, board games, and other entertainment items",
    icon: "gamepad-2",
    defaultBackgroundType: "lifestyle",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Create a custom prompt for any product type",
    icon: "plus",
    defaultBackgroundType: "studio",
  },
]

// Define prompt templates for each product type
export const promptTemplates: PromptTemplate[] = [
  // Clothing templates
  {
    id: "clothing-default",
    productTypeId: "clothing",
    name: "Standard Clothing",
    template: `Create a professional product image of a {gender} model wearing the uploaded {clothing_type}.
The model should have a {body_type} body type, {hairstyle} hair, {height} tall, with skin tone similar to
{skin_tone} hex color. The model should be shown from head to waist in a relaxed front-facing pose.
The image should have a {background} with {lighting}. Make the {clothing_type} the focal point of the image.
Show the fabric texture and details clearly. Photorealistic style, high quality, detailed texture, professional fashion photography.
            `,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for clothing items",
    isDefault: true,
  },
  {
    id: "clothing-lifestyle",
    productTypeId: "clothing",
    name: "Lifestyle Clothing",
    template: `Create a lifestyle image of a {gender} model wearing the uploaded {clothing_type} in a natural setting.
The model should have a {body_type} body type, {hairstyle} hair, {height} tall, 
with skin tone similar to {skin_tone} hex color.
The model should be in a casual pose that shows off the {clothing_type} well.
The image should have a {background} {lighting}.
Photorealistic style, high quality, detailed texture, lifestyle fashion photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Lifestyle setting for clothing items",
  },
  {
    id: "clothing-detail",
    productTypeId: "clothing",
    name: "Detail Focus",
    template: `Create a close-up product image focusing on the details and texture of the uploaded {clothing_type}.
The {clothing_type} should be worn by a {gender} model with a {body_type} body type.
Show fine details like stitching, fabric texture, buttons, zippers, and other design elements.
The image should have a {background} with soft, even lighting to highlight the details.
Photorealistic style, high quality, macro photography, detailed texture, professional product photography.`,
    negativePrompt:
      "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text, full body",
    description: "Close-up focus on clothing details and textures",
  },

  // Footwear templates
  {
    id: "footwear-default",
    productTypeId: "footwear",
    name: "Standard Footwear",
    template: `Create a professional product image of the uploaded {footwear_type}.
The {footwear_type} should be shown from a 3/4 angle to display both the side profile and top.
The image should have a {background} with {lighting} to highlight the materials and design details.
Show the texture, sole, and any special features of the {footwear_type}.
Photorealistic style, high quality, detailed texture, professional product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for footwear items",
    isDefault: true,
  },
  {
    id: "footwear-model",
    productTypeId: "footwear",
    name: "On Model",
    template: `Create a professional product image of a {gender} model wearing the uploaded {footwear_type}.
The model should have a {body_type} body type and be shown from the knees down.
The {footwear_type} should be the focal point of the image.
The image should have a {background} {lighting}.
Photorealistic style, high quality, detailed texture, professional fashion photography.`,
    negativePrompt:
      "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text, full body",
    description: "Footwear shown on a model (partial view)",
  },

  // Accessories templates
  {
    id: "accessories-default",
    productTypeId: "accessories",
    name: "Standard Accessories",
    template: `Create a professional product image of the uploaded {accessory_type}.
The {accessory_type} should be shown in detail with perfect lighting to highlight its features.
The image should have a {background} with {lighting} to showcase the materials and craftsmanship.
Photorealistic style, high quality, detailed texture, professional product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for accessory items",
    isDefault: true,
  },
  {
    id: "accessories-model",
    productTypeId: "accessories",
    name: "On Model",
    template: `Create a professional product image of a {gender} model wearing/using the uploaded {accessory_type}.
The model should have a {body_type} body type, {hairstyle} hair, 
with skin tone similar to {skin_tone} hex color.
The {accessory_type} should be the focal point of the image.
The image should have a {background} {lighting}.
Photorealistic style, high quality, detailed texture, professional fashion photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Accessories shown being worn/used by a model",
  },

  // Electronics templates
  {
    id: "electronics-default",
    productTypeId: "electronics",
    name: "Standard Electronics",
    template: `Create a professional product image of the uploaded {electronics_type}.
The {electronics_type} should be shown from an angle that highlights its design and key features.
The image should have a {background} with {lighting} to create reflections and highlights on the surface.
Show the device powered on with a screen display if applicable.
Photorealistic style, high quality, detailed texture, professional product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for electronic items",
    isDefault: true,
  },
  {
    id: "electronics-lifestyle",
    productTypeId: "electronics",
    name: "Lifestyle Electronics",
    template: `Create a lifestyle image showing the uploaded {electronics_type} being used in a natural setting.
The {electronics_type} should be shown in use, with hands or a person interacting with it if appropriate.
The image should have a {background} {lighting} that suggests a home, office, or outdoor environment.
Photorealistic style, high quality, detailed texture, lifestyle product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Electronics shown in use in a lifestyle setting",
  },

  // Home goods templates
  {
    id: "home-default",
    productTypeId: "home",
    name: "Standard Home Goods",
    template: `Create a professional product image of the uploaded {home_item_type}.
The {home_item_type} should be shown from an angle that highlights its design and key features.
The image should have a {background} with {lighting} to showcase the materials and craftsmanship.
Photorealistic style, high quality, detailed texture, professional product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for home goods",
    isDefault: true,
  },
  {
    id: "home-lifestyle",
    productTypeId: "home",
    name: "Lifestyle Home Goods",
    template: `Create a lifestyle image showing the uploaded {home_item_type} in a beautifully designed room setting.
The {home_item_type} should be the focal point but shown in context with complementary furniture and decor.
The image should have natural {lighting} that creates a warm, inviting atmosphere.
Photorealistic style, high quality, detailed texture, interior design photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Home goods shown in a styled interior setting",
  },

  // Beauty templates
  {
    id: "beauty-default",
    productTypeId: "beauty",
    name: "Standard Beauty",
    template: `Create a professional product image of the uploaded {beauty_product_type}.
The {beauty_product_type} should be shown from an angle that highlights its packaging and design.
The image should have a {background} with {lighting} to create an elegant, premium feel.
Photorealistic style, high quality, detailed texture, professional beauty product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for beauty products",
    isDefault: true,
  },
  {
    id: "beauty-model",
    productTypeId: "beauty",
    name: "On Model",
    template: `Create a beauty image showing the effects of the uploaded {beauty_product_type} on a {gender} model.
The model should have a {body_type} body type, {hairstyle} hair, 
with skin tone similar to {skin_tone} hex color.
Focus on the area where the product is applied (skin, hair, lips, eyes, etc.).
The image should have a {background} with soft, flattering {lighting}.
Photorealistic style, high quality, detailed texture, professional beauty photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Beauty products shown applied on a model",
  },

  // Sports templates
  {
    id: "sports-default",
    productTypeId: "sports",
    name: "Standard Sports",
    template: `Create a professional product image of the uploaded {sports_item_type}.
The {sports_item_type} should be shown from an angle that highlights its design and key features.
The image should have a {background} with {lighting} to showcase the materials and functionality.
Photorealistic style, high quality, detailed texture, professional product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for sports equipment",
    isDefault: true,
  },
  {
    id: "sports-action",
    productTypeId: "sports",
    name: "Action Sports",
    template: `Create an action image showing the uploaded {sports_item_type} being used in a dynamic sports setting.
A {gender} athlete with a {body_type} body type should be shown using the {sports_item_type} in action.
The image should capture movement and energy with {lighting} that highlights the product.
Photorealistic style, high quality, detailed texture, professional sports photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Sports equipment shown in active use",
  },

  // Toys templates
  {
    id: "toys-default",
    productTypeId: "toys",
    name: "Standard Toys",
    template: `Create a professional product image of the uploaded {toy_type}.
The {toy_type} should be shown from an angle that highlights its design and key features.
The image should have a {background} with {lighting} to showcase the colors and details.
Photorealistic style, high quality, detailed texture, professional product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Standard template for toys and games",
    isDefault: true,
  },
  {
    id: "toys-play",
    productTypeId: "toys",
    name: "Play Scene",
    template: `Create a playful scene showing children enjoying the uploaded {toy_type}.
The {toy_type} should be the focal point with children of appropriate age engaged in play.
The image should have a bright, colorful setting with {lighting} that creates a fun atmosphere.
Photorealistic style, high quality, detailed texture, professional lifestyle photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Toys shown being played with by children",
  },

  // Custom template
  {
    id: "custom-default",
    productTypeId: "custom",
    name: "Custom Template",
    template: `Create a professional product image of the uploaded product.
The product should be shown from an angle that highlights its design and key features.
The image should have a {background} with {lighting} to showcase the product effectively.
Photorealistic style, high quality, detailed texture, professional product photography.`,
    negativePrompt: "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    description: "Customizable template for any product type",
    isDefault: true,
  },
]

// Function to get the default template for a product type
export function getDefaultTemplateForProductType(productTypeId: string): PromptTemplate | undefined {
  return promptTemplates.find((template) => template.productTypeId === productTypeId && template.isDefault)
}

// Function to get all templates for a product type
export function getTemplatesForProductType(productTypeId: string): PromptTemplate[] {
  return promptTemplates.filter((template) => template.productTypeId === productTypeId)
}

// Function to get a product type by ID
export function getProductTypeById(productTypeId: string): ProductType | undefined {
  return productTypes.find((type) => type.id === productTypeId)
}

// Function to fill a template with values
export function fillPromptTemplate(
  template: string,
  values: {
    gender?: string
    body_type?: string
    hairstyle?: string
    height?: string
    skin_tone?: string
    background?: string
    lighting?: string
    clothing_type?: string
    footwear_type?: string
    accessory_type?: string
    electronics_type?: string
    home_item_type?: string
    beauty_product_type?: string
    sports_item_type?: string
    toy_type?: string
    [key: string]: string | undefined
  },
): string {
  let filledTemplate = template

  // Replace all placeholders with their values
  Object.entries(values).forEach(([key, value]) => {
    if (value) {
      const regex = new RegExp(`\\{${key}\\}`, "g")
      filledTemplate = filledTemplate.replace(regex, value)
    }
  })

  // Remove any remaining placeholders with empty strings
  filledTemplate = filledTemplate.replace(/\{[^}]+\}/g, "")

  return filledTemplate
}
