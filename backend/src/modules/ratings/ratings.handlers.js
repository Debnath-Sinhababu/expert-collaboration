/**
 * Ratings HTTP handlers extracted from server.js (behavior-preserving).
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function create(req, res) {
  try {
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    console.log('Authenticated user for rating creation:', userData?.user?.id);
    console.log('User error:', userError);

    // Check if user is an institution
    if (userData?.user?.id) {
      const { data: institutionData, error: instError } = await supabaseClient
        .from('institutions')
        .select('id, user_id')
        .eq('user_id', userData.user.id)
        .single();
      
      console.log('User institution data:', institutionData);
      console.log('Requested institution_id:', req.body.institution_id);
      console.log('Institution match:', institutionData?.id === req.body.institution_id);
    }

    console.log('Rating data to insert:', req.body);
    
    // Try to insert with RLS first
    let { data, error } = await supabaseClient
      .from('ratings')
      .insert([req.body])
      .select();
    
      if (error) {
        console.error('Rating creation error:', error);
        throw error;
      }
     
      // After creating the rating with service role, update the expert's aggregate rating
      try {
        const expertId = req.body.expert_id;
        console.log('Expert ID:', expertId);
        if (expertId) {
          console.log('Updating expert rating for expert_id:', expertId);
          
          // Calculate aggregate rating for this expert
          const { data: ratingsData, error: ratingsError } = await supabaseClient
            .from('ratings')
            .select('rating')
            .eq('expert_id', expertId);
          
          if (ratingsError) {
            console.error('Error fetching ratings for aggregate calculation:', ratingsError);
          } else {
            // Calculate average rating
            const totalRatings = ratingsData.length;
            const sumRatings = ratingsData.reduce((sum, item) => sum + (item.rating || 0), 0);
            console.log('sumRatings', sumRatings)
            console.log('totalRatings', totalRatings)
            const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : 0;
            console.log('averageRating', averageRating)
            console.log(`Expert ${expertId} - Total ratings: ${totalRatings}, Sum: ${sumRatings}, Average: ${averageRating}`);
            
            // Update the expert's rating column
            const { error: updateError } = await supabaseClient
              .from('experts')
              .update({ 
                rating: parseFloat(averageRating),
                total_ratings: totalRatings
              })
              .eq('id', expertId);
            
            if (updateError) {
              console.error('Error updating expert rating:', updateError);
            } else {
              console.log(`Successfully updated expert ${expertId} rating to ${averageRating}`);
            }
          }
        }
      } catch (updateError) {
        console.error('Error in expert rating update process:', updateError);
        // Don't fail the rating creation if the update fails
      }
      
      res.status(201).json(data[0]);
      return;
    
   
  } catch (error) {
    console.error('Rating creation error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function list(req, res) {
  try {
    const { expert_id, institution_id, booking_id } = req.query;

    // Validate that expert_id is provided

    console.log('Fetching ratings for expert:', expert_id);

    // Use service role key to fetch ratings (public data)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'Service role key not configured' 
      });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Build the query
    let query = serviceClient
    .from('ratings')
    .select(`
      *,
      expert:experts(id, name, email),
      institution:institutions(id, name)
    `);

  // Apply filters
  if (expert_id) {
    query = query.eq('expert_id', expert_id);
  }
  
  if (institution_id) {
    query = query.eq('institution_id', institution_id);
  }
  
  if (booking_id) {
    query = query.eq('booking_id', booking_id);
  }


    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Ratings fetch error:', error);
      throw error;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  create,
  list,
};
