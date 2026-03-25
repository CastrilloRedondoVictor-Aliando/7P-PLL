BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('tempdb..#EmailCandidates') IS NOT NULL
        DROP TABLE #EmailCandidates;

    SELECT
        u.id,
        u.email AS emailActual,
        CASE
            WHEN LOWER(u.email) LIKE '%@trsa.es'
                THEN LEFT(u.email, LEN(u.email) - LEN('@trsa.es')) + '@tecnicasreunidas.es'
            WHEN LOWER(u.email) LIKE '%@industrial.initec.es'
                THEN LEFT(u.email, LEN(u.email) - LEN('@industrial.initec.es')) + '@tecnicasreunidas.es'
        END AS emailNuevo
    INTO #EmailCandidates
    FROM Usuarios u
    WHERE LOWER(u.email) LIKE '%@trsa.es'
       OR LOWER(u.email) LIKE '%@industrial.initec.es';

    IF EXISTS (
        SELECT 1
        FROM #EmailCandidates c
        JOIN Usuarios u
            ON LOWER(u.email) = LOWER(c.emailNuevo)
           AND u.id <> c.id
    )
    BEGIN
        SELECT
            c.id,
            c.emailActual,
            c.emailNuevo,
            u.id AS conflictingUserId,
            u.email AS conflictingEmail
        FROM #EmailCandidates c
        JOIN Usuarios u
            ON LOWER(u.email) = LOWER(c.emailNuevo)
           AND u.id <> c.id;

        ROLLBACK TRANSACTION;
        THROW 50001, 'La actualizacion genera emails duplicados. Corrige los conflictos antes de ejecutar el cambio.', 1;
    END;

    UPDATE u
    SET
        u.email = c.emailNuevo,
        u.updatedAt = GETDATE()
    FROM Usuarios u
    JOIN #EmailCandidates c
        ON c.id = u.id;

    SELECT @@ROWCOUNT AS registrosActualizados;

    SELECT
        id,
        emailActual,
        emailNuevo
    FROM #EmailCandidates
    ORDER BY id;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;